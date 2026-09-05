type LlmProvider = "openai" | "anthropic" | "gemini" | "nvidia";

const ALLOWED: Record<LlmProvider, { base: string; path: string }> = {
  openai: { base: "https://api.openai.com", path: "/v1/chat/completions" },
  anthropic: { base: "https://api.anthropic.com", path: "/v1/messages" },
  gemini: {
    base: "https://generativelanguage.googleapis.com",
    path: "/v1beta/models",
  },
  // OpenAI-compatible catalog at build.nvidia.com
  nvidia: {
    base: "https://integrate.api.nvidia.com",
    path: "/v1/chat/completions",
  },
};

export async function POST(req: Request) {
  let body: {
    provider: LlmProvider;
    model: string;
    apiKey: string;
    messages: Array<{ role: string; content: string }>;
    tools?: unknown[];
    stream?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { provider, model, apiKey, messages, tools, stream } = body;
  if (!provider || !ALLOWED[provider]) {
    return new Response("Provider not allowlisted", { status: 400 });
  }
  if (!apiKey) return new Response("Missing apiKey", { status: 400 });
  if (!model) return new Response("Missing model", { status: 400 });

  const cfg = ALLOWED[provider];

  try {
    if (provider === "openai" || provider === "nvidia") {
      const res = await fetch(`${cfg.base}${cfg.path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role: m.role === "tool" ? "user" : m.role,
            content: m.content,
          })),
          tools: tools?.length ? tools : undefined,
          stream: !!stream,
        }),
      });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (provider === "anthropic") {
      const system = messages.find((m) => m.role === "system")?.content;
      const res = await fetch(`${cfg.base}${cfg.path}`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system,
          messages: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          tools: tools?.length
            ? (tools as Array<{ function: { name: string; description: string; parameters: unknown } }>).map(
                (t) => ({
                  name: t.function.name,
                  description: t.function.description,
                  input_schema: t.function.parameters,
                }),
              )
            : undefined,
        }),
      });
      const data = await res.json();
      // Normalize to OpenAI-ish shape
      const text =
        data.content?.map((c: { text?: string }) => c.text).filter(Boolean).join("\n") ||
        data.error?.message ||
        "";
      const tool_calls = (data.content || [])
        .filter((c: { type: string }) => c.type === "tool_use")
        .map((c: { id: string; name: string; input: unknown }) => ({
          id: c.id,
          function: { name: c.name, arguments: JSON.stringify(c.input || {}) },
        }));
      return Response.json({
        choices: [{ message: { role: "assistant", content: text, tool_calls } }],
      });
    }

    // gemini
    const url = `${cfg.base}${cfg.path}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const systemInstruction = messages.find((m) => m.role === "system")?.content;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
        tools: tools?.length
          ? [
              {
                functionDeclarations: (
                  tools as Array<{
                    function: { name: string; description: string; parameters: unknown };
                  }>
                ).map((t) => ({
                  name: t.function.name,
                  description: t.function.description,
                  parameters: t.function.parameters,
                })),
              },
            ]
          : undefined,
      }),
    });
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p.text).filter(Boolean).join("\n");
    const tool_calls = parts
      .filter((p: { functionCall?: unknown }) => p.functionCall)
      .map((p: { functionCall: { name: string; args: unknown } }, i: number) => ({
        id: `gemini-${i}`,
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args || {}),
        },
      }));
    return Response.json({
      choices: [{ message: { role: "assistant", content: text, tool_calls } }],
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "LLM error", { status: 502 });
  }
}

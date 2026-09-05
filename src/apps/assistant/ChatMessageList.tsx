export interface ChatMsg {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export function ChatMessageList({ messages }: { messages: ChatMsg[] }) {
  return (
    <>
      {messages.map((m, i) => (
        <div
          key={i}
          className={`rounded-lg px-3 py-2 ${
            m.role === "user"
              ? "bg-[rgba(var(--os-primary-rgb),0.25)] ml-8"
              : "bg-white/5 mr-4"
          }`}
        >
          <div className="text-[10px] uppercase opacity-50 mb-0.5">{m.role}</div>
          <div className="whitespace-pre-wrap break-words">{m.content}</div>
        </div>
      ))}
    </>
  );
}

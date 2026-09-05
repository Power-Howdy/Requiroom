export function langOf(path: string): string {
  const n = path.toLowerCase();
  if (n.endsWith(".ts") || n.endsWith(".tsx")) return "typescript";
  if (n.endsWith(".js") || n.endsWith(".jsx")) return "javascript";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".md")) return "markdown";
  if (n.endsWith(".css")) return "css";
  if (n.endsWith(".html")) return "html";
  if (n.endsWith(".py")) return "python";
  if (n.endsWith(".sh")) return "shell";
  return "plaintext";
}

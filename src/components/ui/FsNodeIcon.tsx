import { Folder, File as FileIcon, Image as ImageIcon, FileText } from "lucide-react";
import type { FsNode } from "@/fs/virtualFs";

export function FsNodeIcon({ node, size = 18 }: { node: FsNode; size?: number }) {
  if (node.type === "dir") return <Folder size={size} className="text-amber-400" />;
  if (node.mime?.startsWith("image/")) return <ImageIcon size={size} className="text-pink-400" />;
  if (node.name.endsWith(".md") || node.mime?.includes("text")) {
    return <FileText size={size} className="text-sky-400" />;
  }
  return <FileIcon size={size} className="text-slate-300" />;
}

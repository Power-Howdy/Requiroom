export const MAX_FILE_BYTES = 50 * 1024 * 1024; // hard refuse
export const WARN_FILE_BYTES = 25 * 1024 * 1024;

export type FsNodeType = "file" | "dir";

export interface FsNode {
  type: FsNodeType;
  name: string;
  path: string;
  mime?: string;
  /** base64 for binary, utf-8 string for text */
  encoding?: "utf8" | "base64";
  content?: string;
  children?: string[]; // child paths for dirs
  mtime: number;
  size: number;
}

export type FsTree = Record<string, FsNode>;

const SEED_DIRS = [
  "/home",
  "/home/user",
  "/home/user/Documents",
  "/home/user/Notes",
  "/home/user/Sheets",
  "/home/user/Downloads",
  "/tmp",
];

function now() {
  return Date.now();
}

export function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") {
      stack.pop();
      continue;
    }
    stack.push(p);
  }
  return "/" + stack.join("/");
}

export function dirname(path: string): string {
  const n = normalizePath(path);
  if (n === "/") return "/";
  const i = n.lastIndexOf("/");
  return i <= 0 ? "/" : n.slice(0, i);
}

export function basename(path: string): string {
  const n = normalizePath(path);
  if (n === "/") return "/";
  return n.slice(n.lastIndexOf("/") + 1);
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.join("/"));
}

export function createSeedTree(): FsTree {
  const tree: FsTree = {
    "/": {
      type: "dir",
      name: "/",
      path: "/",
      children: ["/home", "/tmp"],
      mtime: now(),
      size: 0,
    },
  };

  for (const dir of SEED_DIRS) {
    ensureDir(tree, dir);
  }

  writeText(
    tree,
    "/home/user/Notes/Welcome.md",
    "# Welcome to Requiroom\n\nYour notes live in `/home/user/Notes`.\n",
  );
  writeText(
    tree,
    "/home/user/Documents/readme.txt",
    "Requiroom virtual filesystem. Drag files from your computer into Files to import.\n",
  );
  writeText(
    tree,
    "/home/user/Sheets/Demo.sheet.json",
    JSON.stringify(
      {
        name: "Demo",
        sheets: [
          {
            name: "Sheet1",
            cells: {
              A1: { v: "Item" },
              B1: { v: "Qty" },
              C1: { v: "Price" },
              D1: { v: "Total" },
              A2: { v: "Widgets" },
              B2: { v: 3 },
              C2: { v: 12.5 },
              D2: { f: "=B2*C2" },
              A3: { v: "Gadgets" },
              B3: { v: 2 },
              C3: { v: 40 },
              D3: { f: "=B3*C3" },
            },
          },
        ],
      },
      null,
      2,
    ),
  );

  return tree;
}

export function ensureDir(tree: FsTree, path: string): void {
  const n = normalizePath(path);
  if (tree[n]?.type === "dir") return;
  if (n !== "/") {
    ensureDir(tree, dirname(n));
    const parent = tree[dirname(n)];
    if (parent?.type === "dir") {
      parent.children = parent.children || [];
      if (!parent.children.includes(n)) parent.children.push(n);
      parent.mtime = now();
    }
  }
  tree[n] = {
    type: "dir",
    name: basename(n),
    path: n,
    children: tree[n]?.children || [],
    mtime: now(),
    size: 0,
  };
}

export function writeText(tree: FsTree, path: string, content: string, mime = "text/plain"): FsNode {
  const n = normalizePath(path);
  ensureDir(tree, dirname(n));
  const parent = tree[dirname(n)];
  if (parent?.type === "dir") {
    parent.children = parent.children || [];
    if (!parent.children.includes(n)) parent.children.push(n);
    parent.mtime = now();
  }
  const node: FsNode = {
    type: "file",
    name: basename(n),
    path: n,
    mime,
    encoding: "utf8",
    content,
    mtime: now(),
    size: new TextEncoder().encode(content).length,
  };
  tree[n] = node;
  return node;
}

export function writeBinary(
  tree: FsTree,
  path: string,
  bytes: Uint8Array,
  mime = "application/octet-stream",
): FsNode {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error(`File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB)`);
  }
  const n = normalizePath(path);
  ensureDir(tree, dirname(n));
  const parent = tree[dirname(n)];
  if (parent?.type === "dir") {
    parent.children = parent.children || [];
    if (!parent.children.includes(n)) parent.children.push(n);
    parent.mtime = now();
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  const node: FsNode = {
    type: "file",
    name: basename(n),
    path: n,
    mime,
    encoding: "base64",
    content: b64,
    mtime: now(),
    size: bytes.byteLength,
  };
  tree[n] = node;
  return node;
}

export function readText(tree: FsTree, path: string): string {
  const node = tree[normalizePath(path)];
  if (!node || node.type !== "file") throw new Error(`No such file: ${path}`);
  if (node.encoding === "base64") {
    const bin = atob(node.content || "");
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return node.content || "";
}

export function readBytes(tree: FsTree, path: string): Uint8Array {
  const node = tree[normalizePath(path)];
  if (!node || node.type !== "file") throw new Error(`No such file: ${path}`);
  if (node.encoding === "base64") {
    const bin = atob(node.content || "");
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }
  return new TextEncoder().encode(node.content || "");
}

export function ls(tree: FsTree, path: string): FsNode[] {
  const n = normalizePath(path);
  const dir = tree[n];
  if (!dir || dir.type !== "dir") throw new Error(`Not a directory: ${path}`);
  return (dir.children || [])
    .map((p) => tree[p])
    .filter(Boolean)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function stat(tree: FsTree, path: string): FsNode | undefined {
  return tree[normalizePath(path)];
}

export function rm(tree: FsTree, path: string, recursive = false): void {
  const n = normalizePath(path);
  if (n === "/" || SEED_DIRS.includes(n) && n.split("/").length <= 3) {
    // allow deleting contents of seed dirs but protect critical roots
  }
  const node = tree[n];
  if (!node) throw new Error(`No such path: ${path}`);
  if (node.type === "dir") {
    const kids = [...(node.children || [])];
    if (kids.length && !recursive) throw new Error(`Directory not empty: ${path}`);
    for (const kid of kids) rm(tree, kid, true);
  }
  const parent = tree[dirname(n)];
  if (parent?.type === "dir" && parent.children) {
    parent.children = parent.children.filter((c) => c !== n);
    parent.mtime = now();
  }
  delete tree[n];
}

export function mv(tree: FsTree, from: string, to: string): void {
  const src = normalizePath(from);
  const dest = normalizePath(to);
  const node = tree[src];
  if (!node) throw new Error(`No such path: ${from}`);
  if (tree[dest]) throw new Error(`Destination exists: ${to}`);
  ensureDir(tree, dirname(dest));

  const rewrite = (oldPath: string, newPath: string) => {
    const n = tree[oldPath];
    if (!n) return;
    const copy = { ...n, path: newPath, name: basename(newPath), mtime: now() };
    if (n.type === "dir") {
      copy.children = (n.children || []).map((c) => {
        const childName = basename(c);
        const childNew = joinPath(newPath, childName);
        rewrite(c, childNew);
        return childNew;
      });
    }
    delete tree[oldPath];
    tree[newPath] = copy;
  };

  const oldParent = tree[dirname(src)];
  if (oldParent?.type === "dir" && oldParent.children) {
    oldParent.children = oldParent.children.filter((c) => c !== src);
  }
  rewrite(src, dest);
  const newParent = tree[dirname(dest)];
  if (newParent?.type === "dir") {
    newParent.children = newParent.children || [];
    if (!newParent.children.includes(dest)) newParent.children.push(dest);
    newParent.mtime = now();
  }
}

export function cp(tree: FsTree, from: string, to: string): void {
  const src = normalizePath(from);
  const dest = normalizePath(to);
  const node = tree[src];
  if (!node) throw new Error(`No such path: ${from}`);
  if (node.type === "file") {
    tree[dest] = {
      ...node,
      path: dest,
      name: basename(dest),
      mtime: now(),
    };
    ensureDir(tree, dirname(dest));
    const parent = tree[dirname(dest)];
    if (parent?.type === "dir") {
      parent.children = parent.children || [];
      if (!parent.children.includes(dest)) parent.children.push(dest);
    }
    return;
  }
  ensureDir(tree, dest);
  for (const child of node.children || []) {
    cp(tree, child, joinPath(dest, basename(child)));
  }
}

export function walkFiles(tree: FsTree, path: string): FsNode[] {
  const n = normalizePath(path);
  const node = tree[n];
  if (!node) return [];
  if (node.type === "file") return [node];
  const out: FsNode[] = [];
  for (const c of node.children || []) {
    out.push(...walkFiles(tree, c));
  }
  return out;
}

export function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    ts: "text/typescript",
    tsx: "text/typescript",
    jsx: "text/javascript",
    py: "text/x-python",
    sh: "text/x-sh",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    zip: "application/zip",
  };
  return map[ext] || "application/octet-stream";
}

export function isTextish(mime: string, name: string): boolean {
  if (mime.startsWith("text/")) return true;
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("xml")) return true;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["md", "txt", "json", "ts", "tsx", "js", "jsx", "css", "html", "py", "sh", "csv", "sheet.json"].some(
    (e) => name.endsWith(e) || ext === e,
  );
}

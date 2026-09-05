"use client";

import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { guessMime, isTextish, joinPath, walkFiles, type FsTree } from "@/fs/virtualFs";
import { useFsStore } from "@/store/fsStore";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importHostFiles(
  files: FileList | File[],
  destDir: string,
): Promise<{ imported: number; warned: boolean }> {
  const fs = useFsStore.getState();
  let imported = 0;
  let warned = false;
  const list = Array.from(files);

  for (const file of list) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const path = joinPath(destDir, rel);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = file.type || guessMime(file.name);
    if (isTextish(mime, file.name) && bytes.byteLength < 2 * 1024 * 1024) {
      fs.writeText(path, new TextDecoder().decode(bytes), mime);
    } else {
      const r = fs.writeBinary(path, bytes, mime);
      if (r.warned) warned = true;
    }
    imported += 1;
  }
  return { imported, warned };
}

export function exportFsFile(path: string) {
  const fs = useFsStore.getState();
  const node = fs.stat(path);
  if (!node || node.type !== "file") throw new Error("Not a file");
  const bytes = fs.readBytes(path);
  downloadBlob(
    new Blob([bytes.buffer as ArrayBuffer], { type: node.mime || "application/octet-stream" }),
    node.name,
  );
}

export function exportFsFolderZip(path: string, tree: FsTree) {
  const files = walkFiles(tree, path);
  const fs = useFsStore.getState();
  const zipped: Record<string, Uint8Array> = {};
  const base = path === "/" ? "" : path.replace(/^\//, "") + "/";
  for (const f of files) {
    const rel = f.path.replace(/^\//, "").startsWith(base.replace(/\/$/, ""))
      ? f.path.replace(/^\//, "").slice(base.length) || f.name
      : f.name;
    zipped[rel || f.name] = fs.readBytes(f.path);
  }
  const out = zipSync(zipped);
  const name = path === "/" ? "requiroom-root.zip" : `${path.split("/").pop()}.zip`;
  downloadBlob(new Blob([out.buffer as ArrayBuffer], { type: "application/zip" }), name);
}

export async function importZipToVfs(file: File, destDir: string) {
  const fs = useFsStore.getState();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const unzipped = unzipSync(bytes);
  let count = 0;
  for (const [name, data] of Object.entries(unzipped)) {
    if (name.endsWith("/")) continue;
    const path = joinPath(destDir, name);
    const mime = guessMime(name);
    if (isTextish(mime, name)) {
      fs.writeText(path, strFromU8(data), mime);
    } else {
      fs.writeBinary(path, data, mime);
    }
    count++;
  }
  return count;
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

export async function openFromDisk(destDir: string): Promise<number> {
  // @ts-expect-error File System Access API
  const handles = await window.showOpenFilePicker({ multiple: true });
  const files: File[] = [];
  for (const h of handles) {
    files.push(await h.getFile());
  }
  const r = await importHostFiles(files, destDir);
  return r.imported;
}

export async function saveToDisk(path: string) {
  const fs = useFsStore.getState();
  const node = fs.stat(path);
  if (!node || node.type !== "file") throw new Error("Not a file");
  // @ts-expect-error File System Access API
  const handle = await window.showSaveFilePicker({
    suggestedName: node.name,
  });
  const writable = await handle.createWritable();
  await writable.write(fs.readBytes(path));
  await writable.close();
}

export async function importDirectoryFromDisk(destDir: string): Promise<number> {
  // @ts-expect-error File System Access API
  const dirHandle = await window.showDirectoryPicker();
  const files: File[] = [];

  async function walk(handle: FileSystemDirectoryHandle, prefix: string) {
    // @ts-expect-error async iterator
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === "file") {
        const f = await entry.getFile();
        Object.defineProperty(f, "webkitRelativePath", {
          value: prefix ? `${prefix}/${name}` : name,
        });
        files.push(f);
      } else if (entry.kind === "directory") {
        await walk(entry, prefix ? `${prefix}/${name}` : name);
      }
    }
  }

  await walk(dirHandle, dirHandle.name);
  const r = await importHostFiles(files, destDir);
  return r.imported;
}

export { strToU8 };

"use client";

import { create } from "zustand";
import {
  createSeedTree,
  type FsTree,
  type FsNode,
  normalizePath,
  dirname,
  ensureDir,
  writeText,
  writeBinary,
  readText,
  readBytes,
  ls,
  rm,
  mv,
  cp,
  stat,
  WARN_FILE_BYTES,
} from "@/fs/virtualFs";
import { idbGet, idbSet } from "@/lib/idb";

interface FsState {
  tree: FsTree;
  ready: boolean;
  init: () => Promise<void>;
  persist: () => Promise<void>;
  refresh: () => void;
  mkdir: (path: string) => void;
  writeText: (path: string, content: string, mime?: string) => void;
  writeBinary: (path: string, bytes: Uint8Array, mime?: string) => { warned: boolean };
  readText: (path: string) => string;
  readBytes: (path: string) => Uint8Array;
  ls: (path: string) => FsNode[];
  rm: (path: string, recursive?: boolean) => void;
  mv: (from: string, to: string) => void;
  cp: (from: string, to: string) => void;
  stat: (path: string) => FsNode | undefined;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useFsStore = create<FsState>((set, get) => ({
  tree: createSeedTree(),
  ready: false,

  init: async () => {
    const saved = await idbGet<FsTree>("vfs", "tree");
    if (saved && saved["/"]) {
      set({ tree: saved, ready: true });
    } else {
      const tree = createSeedTree();
      set({ tree, ready: true });
      await idbSet("vfs", "tree", tree);
    }
  },

  persist: async () => {
    await idbSet("vfs", "tree", get().tree);
  },

  refresh: () => set({ tree: { ...get().tree } }),

  mkdir: (path) => {
    const n = normalizePath(path);
    const tree: FsTree = { ...get().tree };
    ensureDir(tree, n);
    const parentPath = dirname(n);
    const parent = tree[parentPath];
    if (parent?.type === "dir") {
      tree[parentPath] = {
        ...parent,
        children: [...(parent.children || [])],
        mtime: Date.now(),
      };
    }
    set({ tree });
    schedulePersist(get);
  },

  writeText: (path, content, mime) => {
    const tree = { ...get().tree };
    writeText(tree, path, content, mime);
    set({ tree });
    schedulePersist(get);
  },

  writeBinary: (path, bytes, mime) => {
    const tree = { ...get().tree };
    writeBinary(tree, path, bytes, mime);
    set({ tree });
    schedulePersist(get);
    return { warned: bytes.byteLength > WARN_FILE_BYTES };
  },

  readText: (path) => readText(get().tree, path),
  readBytes: (path) => readBytes(get().tree, path),
  ls: (path) => ls(get().tree, path),
  rm: (path, recursive) => {
    const tree = { ...get().tree };
    rm(tree, path, recursive);
    set({ tree });
    schedulePersist(get);
  },
  mv: (from, to) => {
    const tree = { ...get().tree };
    mv(tree, from, to);
    set({ tree });
    schedulePersist(get);
  },
  cp: (from, to) => {
    const tree = { ...get().tree };
    cp(tree, from, to);
    set({ tree });
    schedulePersist(get);
  },
  stat: (path) => stat(get().tree, path),
}));

function schedulePersist(get: () => FsState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void get().persist();
  }, 300);
}

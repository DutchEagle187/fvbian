"use client";

import * as React from "react";

import { useSyncedStore } from "@/lib/use-synced-store";

const LOCAL_KEY = "fvbian:bookmarks:v2";
const LEGACY_KEY = "fvbian:bookmarks";

export interface Folder {
  id: string;
  name: string;
  emoji?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  tags?: string[];
  folderId: string | null;
  createdAt: number;
}

export interface BookmarksState {
  folders: Folder[];
  bookmarks: Bookmark[];
}

const EMPTY: BookmarksState = { folders: [], bookmarks: [] };

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Migrate the old flat bookmark list (pre-folders) if present.
function migrate(): BookmarksState | null {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    const arr = JSON.parse(legacy) as {
      id: string;
      title: string;
      url: string;
    }[];
    return {
      folders: [],
      bookmarks: arr.map((b) => ({
        id: b.id || uid(),
        url: b.url,
        title: b.title,
        folderId: null,
        createdAt: Date.now(),
      })),
    };
  } catch {
    return null;
  }
}

export function useBookmarks() {
  const { state, update, ready, configured } = useSyncedStore<BookmarksState>({
    apiKey: "bookmarks",
    localKey: LOCAL_KEY,
    initial: EMPTY,
    migrate,
  });

  const addFolder = React.useCallback(
    (name: string, emoji?: string) => {
      const folder: Folder = { id: uid(), name, emoji };
      update((s) => ({ ...s, folders: [...s.folders, folder] }));
      return folder.id;
    },
    [update]
  );

  const updateFolder = React.useCallback(
    (id: string, patch: Partial<Omit<Folder, "id">>) => {
      update((s) => ({
        ...s,
        folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }));
    },
    [update]
  );

  const deleteFolder = React.useCallback(
    (id: string) => {
      update((s) => ({
        folders: s.folders.filter((f) => f.id !== id),
        bookmarks: s.bookmarks.map((b) =>
          b.folderId === id ? { ...b, folderId: null } : b
        ),
      }));
    },
    [update]
  );

  const addBookmark = React.useCallback(
    (bookmark: Omit<Bookmark, "id" | "createdAt">) => {
      update((s) => ({
        ...s,
        bookmarks: [
          { ...bookmark, id: uid(), createdAt: Date.now() },
          ...s.bookmarks,
        ],
      }));
    },
    [update]
  );

  const updateBookmark = React.useCallback(
    (id: string, patch: Partial<Omit<Bookmark, "id">>) => {
      update((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((b) =>
          b.id === id ? { ...b, ...patch } : b
        ),
      }));
    },
    [update]
  );

  const deleteBookmark = React.useCallback(
    (id: string) => {
      update((s) => ({
        ...s,
        bookmarks: s.bookmarks.filter((b) => b.id !== id),
      }));
    },
    [update]
  );

  const moveBookmark = React.useCallback(
    (id: string, folderId: string | null) => {
      update((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((b) =>
          b.id === id ? { ...b, folderId } : b
        ),
      }));
    },
    [update]
  );

  // Move `draggedId` to sit right before `targetId` in the global order.
  const reorderBookmark = React.useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      update((s) => {
        const list = [...s.bookmarks];
        const from = list.findIndex((b) => b.id === draggedId);
        const to = list.findIndex((b) => b.id === targetId);
        if (from === -1 || to === -1) return s;
        const [moved] = list.splice(from, 1);
        const insertAt = list.findIndex((b) => b.id === targetId);
        list.splice(insertAt, 0, moved);
        return { ...s, bookmarks: list };
      });
    },
    [update]
  );

  return {
    state,
    ready,
    configured,
    addFolder,
    updateFolder,
    deleteFolder,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    moveBookmark,
    reorderBookmark,
  };
}

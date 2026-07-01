"use client";

import * as React from "react";

const KEY = "fvbian:bookmarks:v2";
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

function load(): BookmarksState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as BookmarksState;

    // One-time migration from the old flat bookmark list.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
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
    }
  } catch {
    // ignore malformed storage
  }
  return EMPTY;
}

export function useBookmarks() {
  const [state, setState] = React.useState<BookmarksState>(EMPTY);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const addFolder = React.useCallback((name: string, emoji?: string) => {
    const folder: Folder = { id: uid(), name, emoji };
    setState((s) => ({ ...s, folders: [...s.folders, folder] }));
    return folder.id;
  }, []);

  const renameFolder = React.useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  }, []);

  const deleteFolder = React.useCallback((id: string) => {
    setState((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      // Keep the bookmarks, just move them back to "Unsortiert".
      bookmarks: s.bookmarks.map((b) =>
        b.folderId === id ? { ...b, folderId: null } : b
      ),
    }));
  }, []);

  const addBookmark = React.useCallback(
    (bookmark: Omit<Bookmark, "id" | "createdAt">) => {
      setState((s) => ({
        ...s,
        bookmarks: [
          { ...bookmark, id: uid(), createdAt: Date.now() },
          ...s.bookmarks,
        ],
      }));
    },
    []
  );

  const deleteBookmark = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      bookmarks: s.bookmarks.filter((b) => b.id !== id),
    }));
  }, []);

  const moveBookmark = React.useCallback(
    (id: string, folderId: string | null) => {
      setState((s) => ({
        ...s,
        bookmarks: s.bookmarks.map((b) =>
          b.id === id ? { ...b, folderId } : b
        ),
      }));
    },
    []
  );

  return {
    state,
    ready,
    addFolder,
    renameFolder,
    deleteFolder,
    addBookmark,
    deleteBookmark,
    moveBookmark,
  };
}

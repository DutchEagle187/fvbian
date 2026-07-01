"use client";

import * as React from "react";

import { useSyncedStore } from "@/lib/use-synced-store";

export interface NoteFolder {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  updatedAt: number;
}

export interface NotebookState {
  folders: NoteFolder[];
  notes: Note[];
}

const EMPTY: NotebookState = { folders: [], notes: [] };
const LOCAL_KEY = "fvbian:notebook";
const LEGACY_NOTES = "fvbian:notes";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Migrate the old single-note string into one note.
function migrate(): NotebookState | null {
  try {
    const legacy = localStorage.getItem(LEGACY_NOTES);
    if (!legacy) return null;
    const content = JSON.parse(legacy) as string;
    if (typeof content !== "string" || !content.trim()) return null;
    return {
      folders: [],
      notes: [
        {
          id: uid(),
          folderId: null,
          title: content.split("\n")[0]?.slice(0, 60) || "Notiz",
          content,
          updatedAt: Date.now(),
        },
      ],
    };
  } catch {
    return null;
  }
}

export function noteTitle(note: Note): string {
  if (note.title.trim()) return note.title.trim();
  const firstLine = note.content
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find(Boolean);
  return firstLine?.slice(0, 60) || "Neue Notiz";
}

export function useNotebook() {
  const store = useSyncedStore<NotebookState>({
    apiKey: "notebook",
    localKey: LOCAL_KEY,
    initial: EMPTY,
    migrate,
  });
  const { update } = store;

  const addFolder = React.useCallback(
    (name: string) => {
      const folder: NoteFolder = { id: uid(), name };
      update((s) => ({ ...s, folders: [...s.folders, folder] }));
      return folder.id;
    },
    [update]
  );

  const renameFolder = React.useCallback(
    (id: string, name: string) => {
      update((s) => ({
        ...s,
        folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
      }));
    },
    [update]
  );

  const deleteFolder = React.useCallback(
    (id: string) => {
      update((s) => ({
        folders: s.folders.filter((f) => f.id !== id),
        notes: s.notes.map((n) =>
          n.folderId === id ? { ...n, folderId: null } : n
        ),
      }));
    },
    [update]
  );

  const addNote = React.useCallback(
    (folderId: string | null) => {
      const id = uid();
      update((s) => ({
        ...s,
        notes: [
          { id, folderId, title: "", content: "", updatedAt: Date.now() },
          ...s.notes,
        ],
      }));
      return id;
    },
    [update]
  );

  const updateNote = React.useCallback(
    (id: string, patch: Partial<Omit<Note, "id">>) => {
      update((s) => ({
        ...s,
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
        ),
      }));
    },
    [update]
  );

  const deleteNote = React.useCallback(
    (id: string) => {
      update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    },
    [update]
  );

  const moveNote = React.useCallback(
    (id: string, folderId: string | null) => {
      update((s) => ({
        ...s,
        notes: s.notes.map((n) => (n.id === id ? { ...n, folderId } : n)),
      }));
    },
    [update]
  );

  return {
    state: store.state,
    ready: store.ready,
    configured: store.configured,
    saving: store.saving,
    saveError: store.saveError,
    flush: store.flush,
    addFolder,
    renameFolder,
    deleteFolder,
    addNote,
    updateNote,
    deleteNote,
    moveNote,
  };
}

"use client";

import * as React from "react";

import { useSyncedStore } from "@/lib/use-synced-store";

const LOCAL_KEY = "fvbian:todos";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function useTodos() {
  const { state, update, ready } = useSyncedStore<Todo[]>({
    apiKey: "todos",
    localKey: LOCAL_KEY,
    initial: [],
  });

  const add = React.useCallback(
    (text: string) => {
      update((prev) => [{ id: uid(), text, done: false }, ...prev]);
    },
    [update]
  );

  const toggle = React.useCallback(
    (id: string) => {
      update((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      );
    },
    [update]
  );

  const remove = React.useCallback(
    (id: string) => {
      update((prev) => prev.filter((t) => t.id !== id));
    },
    [update]
  );

  return { todos: state, ready, add, toggle, remove };
}

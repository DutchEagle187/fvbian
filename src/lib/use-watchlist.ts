"use client";

import * as React from "react";

import { useSyncedStore } from "@/lib/use-synced-store";

export type MediaType = "movie" | "tv" | "book";
export type WatchStatus = "planned" | "active" | "done";

export interface WatchItem {
  id: string;
  type: MediaType;
  title: string;
  year?: string;
  poster?: string;
  subtitle?: string;
  sourceId?: string;
  status: WatchStatus;
  rating?: number; // 1..5
  addedAt: number;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function useWatchlist() {
  const { state, update, ready } = useSyncedStore<WatchItem[]>({
    apiKey: "watchlist",
    localKey: "fvbian:watchlist",
    initial: [],
  });

  const add = React.useCallback(
    (item: Omit<WatchItem, "id" | "addedAt">) => {
      update((prev) => [{ ...item, id: uid(), addedAt: Date.now() }, ...prev]);
    },
    [update]
  );

  const updateItem = React.useCallback(
    (id: string, patch: Partial<WatchItem>) => {
      update((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
      );
    },
    [update]
  );

  const remove = React.useCallback(
    (id: string) => {
      update((prev) => prev.filter((i) => i.id !== id));
    },
    [update]
  );

  return { items: state, ready, add, updateItem, remove };
}

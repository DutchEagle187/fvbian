"use client";

import * as React from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MediaType } from "@/lib/use-watchlist";
import { cn } from "@/lib/utils";

interface SearchResult {
  sourceId: string;
  type: MediaType;
  title: string;
  year?: string;
  poster?: string;
  subtitle?: string;
}

const TYPES: { key: MediaType; label: string }[] = [
  { key: "movie", label: "Film" },
  { key: "tv", label: "Serie" },
  { key: "book", label: "Buch" },
];

export function WatchlistAddDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (result: SearchResult) => void;
}) {
  const [type, setType] = React.useState<MediaType>("movie");
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setError(null);
      setAdded(new Set());
    }
  }, [open]);

  React.useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      fetch(
        `/api/watchlist/search?type=${type}&q=${encodeURIComponent(q.trim())}`
      )
        .then((r) => r.json())
        .then((res: { results: SearchResult[]; error?: string }) => {
          setResults(res.results ?? []);
          setError(res.error ?? null);
        })
        .catch(() => setError("Suche fehlgeschlagen."))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(id);
  }, [q, type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Zur Watchlist hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-md border p-0.5">
          {TYPES.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={type === t.key ? "default" : "ghost"}
              className="h-7 flex-1"
              onClick={() => setType(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              type === "book" ? "Buchtitel suchen…" : "Titel suchen…"
            }
            className="pl-9"
          />
        </div>

        {error && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
            {error}
          </p>
        )}

        <div className="min-h-40 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Suche…
            </div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q.trim() ? "Nichts gefunden." : "Tippe, um zu suchen."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {results.map((r) => {
                const isAdded = added.has(r.sourceId);
                return (
                  <button
                    key={r.sourceId}
                    onClick={() => {
                      onAdd(r);
                      setAdded((s) => new Set(s).add(r.sourceId));
                    }}
                    disabled={isAdded}
                    className={cn(
                      "group flex gap-2 rounded-md border p-2 text-left transition-colors hover:bg-accent",
                      isAdded && "opacity-60"
                    )}
                  >
                    <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                      {r.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.poster}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">
                        {r.title}
                      </p>
                      {r.year && (
                        <p className="text-xs text-muted-foreground">{r.year}</p>
                      )}
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {isAdded ? (
                          <>
                            <Check className="size-3 text-green-500" />{" "}
                            Hinzugefügt
                          </>
                        ) : (
                          <>
                            <Plus className="size-3" /> Hinzufügen
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

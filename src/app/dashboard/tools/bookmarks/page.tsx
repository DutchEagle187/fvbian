"use client";

import * as React from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "fvbian:bookmarks";

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);
  const [ready, setReady] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, ready]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const clean = normalizeUrl(url.trim());
    setBookmarks((prev) => [
      {
        id: `${Date.now()}-${prev.length}`,
        title: title.trim() || clean.replace(/^https?:\/\//, ""),
        url: clean,
      },
      ...prev,
    ]);
    setTitle("");
    setUrl("");
  }

  function remove(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Lesezeichen"
        description="Deine wichtigsten Links, lokal in diesem Browser gespeichert."
      />

      <Card className="mb-6">
        <CardContent>
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Titel (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sm:max-w-[14rem]"
            />
            <Input
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="size-4" /> Hinzufügen
            </Button>
          </form>
        </CardContent>
      </Card>

      {bookmarks.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Noch keine Lesezeichen. Füge oben deinen ersten Link hinzu.
        </p>
      ) : (
        <div className="grid gap-3">
          {bookmarks.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between gap-3">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {b.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {b.url}
                    </span>
                  </span>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Löschen"
                  onClick={() => remove(b.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

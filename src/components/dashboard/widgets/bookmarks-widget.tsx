"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "fvbian:bookmarks";

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export function BookmarksWidget() {
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base font-medium text-muted-foreground">
          Lesezeichen
          <Link
            href="/dashboard/tools/bookmarks"
            className="inline-flex items-center gap-1 text-xs transition-colors hover:text-foreground"
          >
            alle <ArrowRight className="size-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Noch keine Lesezeichen.{" "}
            <Link
              href="/dashboard/tools/bookmarks"
              className="underline underline-offset-4"
            >
              Hinzufügen
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {bookmarks.slice(0, 6).map((b) => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent/50"
              >
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{b.title}</span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

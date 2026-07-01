"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBookmarks } from "@/lib/use-bookmarks";

export function BookmarksWidget() {
  const { state, ready } = useBookmarks();
  const recent = state.bookmarks.slice(0, 8);

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
        {!ready ? null : recent.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((b) => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent/50"
              >
                {b.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.favicon}
                    alt=""
                    className="size-4 shrink-0 rounded-sm"
                  />
                ) : (
                  <Globe className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 truncate">{b.title}</span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

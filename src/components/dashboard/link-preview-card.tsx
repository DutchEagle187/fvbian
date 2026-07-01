"use client";

import * as React from "react";
import { ExternalLink, Globe } from "lucide-react";

interface Preview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

// Simple in-memory cache so the same URL isn't fetched repeatedly.
const cache = new Map<string, Preview>();

export function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = React.useState<Preview | null>(
    () => cache.get(url) ?? null
  );
  const [loading, setLoading] = React.useState(!cache.has(url));

  React.useEffect(() => {
    if (cache.has(url)) {
      setPreview(cache.get(url)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((p: Preview) => {
        if (cancelled) return;
        cache.set(url, p);
        setPreview(p);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="not-prose my-2 flex overflow-hidden rounded-lg border no-underline transition-shadow hover:shadow-md"
    >
      {preview?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt=""
          className="h-24 w-32 shrink-0 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-24 w-32 shrink-0 items-center justify-center bg-muted">
          <Globe className="size-6 text-muted-foreground/50" />
        </div>
      )}
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {preview?.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.favicon} alt="" className="size-4 rounded-sm" />
          ) : (
            <ExternalLink className="size-3.5" />
          )}
          <span className="truncate">{preview?.siteName ?? host}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-medium">
          {loading ? "Lädt Vorschau…" : preview?.title ?? host}
        </p>
        {preview?.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

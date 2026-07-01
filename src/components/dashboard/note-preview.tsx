"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { LinkPreviewCard } from "@/components/dashboard/link-preview-card";

const URL_LINE = /^(https?:\/\/[^\s]+)$/i;

type Segment = { type: "md"; text: string } | { type: "link"; url: string };

// A line that is nothing but a URL becomes a rich preview card; everything
// else is rendered as Markdown.
function toSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length) {
      segments.push({ type: "md", text: buffer.join("\n") });
      buffer = [];
    }
  };
  for (const line of content.split("\n")) {
    const m = line.trim().match(URL_LINE);
    if (m) {
      flush();
      segments.push({ type: "link", url: m[1] });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return segments;
}

export function NotePreview({ content }: { content: string }) {
  const segments = React.useMemo(() => toSegments(content), [content]);

  if (!content.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        Vorschau erscheint hier. Nutze Markdown, füge Bilder oder Links ein.
      </p>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-lg prose-headings:font-semibold">
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <LinkPreviewCard key={i} url={seg.url} />
        ) : (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
            {seg.text}
          </ReactMarkdown>
        )
      )}
    </div>
  );
}

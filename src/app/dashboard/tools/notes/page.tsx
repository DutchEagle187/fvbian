"use client";

import * as React from "react";
import {
  Bold,
  Check,
  Cloud,
  CloudOff,
  Heading,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { NotePreview } from "@/components/dashboard/note-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSyncedStore } from "@/lib/use-synced-store";
import { cn } from "@/lib/utils";

type Mode = "edit" | "split" | "preview";

export default function NotesPage() {
  const { state, update, ready, configured } = useSyncedStore<string>({
    apiKey: "notes",
    localKey: "fvbian:notes",
    initial: "",
  });
  const [mode, setMode] = React.useState<Mode>("split");
  const [saved, setSaved] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function change(value: string) {
    update(value);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  // Insert/replace at the current cursor, keeping focus.
  function apply(
    transform: (sel: string) => { text: string; caret?: number }
  ) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = state.slice(start, end);
    const { text, caret } = transform(sel);
    const next = state.slice(0, start) + text + state.slice(end);
    change(next);
    const pos = start + (caret ?? text.length);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  const surround = (before: string, after = before, ph = "") =>
    apply((sel) => ({
      text: `${before}${sel || ph}${after}`,
      caret: sel ? undefined : before.length + (ph.length || 0),
    }));

  const insertBlock = (text: string) =>
    apply(() => ({ text: `${text}` }));

  async function uploadFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of images) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Upload fehlgeschlagen.");
          break;
        }
        insertBlock(`\n![](${data.url})\n`);
      } catch {
        setError("Upload fehlgeschlagen.");
        break;
      }
    }
    setUploading(false);
  }

  return (
    <div>
      <PageHeader
        title="Notizen"
        description={
          configured
            ? "Markdown mit Bildern & Link-Vorschau — synchron über deine Geräte."
            : "Markdown mit Bildern & Link-Vorschau — lokal gespeichert."
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <ToolButton title="Überschrift" onClick={() => surround("## ", "", "Titel")}>
            <Heading className="size-4" />
          </ToolButton>
          <ToolButton title="Fett" onClick={() => surround("**", "**", "fett")}>
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton title="Liste" onClick={() => surround("- ", "", "Punkt")}>
            <List className="size-4" />
          </ToolButton>
          <ToolButton
            title="Link"
            onClick={() => surround("[", "](https://)", "Text")}
          >
            <LinkIcon className="size-4" />
          </ToolButton>
          <ToolButton
            title="Bild per URL"
            onClick={() => surround("![](", ")", "https://…")}
          >
            <ImageIcon className="size-4" />
          </ToolButton>
          <ToolButton
            title="Bild hochladen"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
          </ToolButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex gap-1 rounded-md border p-0.5">
          {(["edit", "split", "preview"] as Mode[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "ghost"}
              className="h-7"
              onClick={() => setMode(m)}
            >
              {m === "edit"
                ? "Bearbeiten"
                : m === "split"
                  ? "Geteilt"
                  : "Vorschau"}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div
        className={cn(
          "grid gap-4",
          mode === "split" ? "md:grid-cols-2" : "grid-cols-1"
        )}
      >
        {mode !== "preview" && (
          <Card>
            <CardContent>
              <Textarea
                ref={ref}
                value={state}
                onChange={(e) => change(e.target.value)}
                onPaste={(e) => {
                  const files = e.clipboardData.files;
                  if (files.length > 0) {
                    e.preventDefault();
                    uploadFiles(files);
                  }
                }}
                onDrop={(e) => {
                  if (e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    uploadFiles(e.dataTransfer.files);
                  }
                }}
                placeholder="Schreib etwas… Markdown, Bilder (einfügen/ziehen) und Links werden unterstützt."
                className="min-h-[55vh] resize-none font-mono text-sm"
                disabled={!ready}
              />
            </CardContent>
          </Card>
        )}
        {mode !== "edit" && (
          <Card>
            <CardContent className="min-h-[55vh]">
              <NotePreview content={state} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {saved ? (
            <>
              <Check className="size-4 text-green-500" /> Gespeichert
            </>
          ) : (
            <>
              {configured ? (
                <Cloud className="size-4" />
              ) : (
                <CloudOff className="size-4" />
              )}
              {state.length} Zeichen
            </>
          )}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => change("")}
          disabled={!state}
        >
          <Trash2 className="size-4" /> Leeren
        </Button>
      </div>
    </div>
  );
}

function ToolButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8"
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

"use client";

import * as React from "react";
import {
  ArrowLeft,
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

import { NotePreview } from "@/components/dashboard/note-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Note } from "@/lib/use-notebook";
import { cn } from "@/lib/utils";

type Mode = "edit" | "split" | "preview";

export function NoteEditor({
  note,
  onPatch,
  onBack,
  onDelete,
  saving,
  saveError,
  onFlush,
}: {
  note: Note;
  onPatch: (patch: { title?: string; content?: string }) => void;
  onBack: () => void;
  onDelete: () => void;
  saving: boolean;
  saveError: string | null;
  onFlush: () => void;
}) {
  const [mode, setMode] = React.useState<Mode>("split");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const content = note.content;

  function apply(
    transform: (sel: string) => { text: string; caret?: number }
  ) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = content.slice(start, end);
    const { text, caret } = transform(sel);
    const next = content.slice(0, start) + text + content.slice(end);
    onPatch({ content: next });
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
        apply(() => ({ text: `\n![](${data.url})\n` }));
      } catch {
        setError("Upload fehlgeschlagen.");
        break;
      }
    }
    setUploading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Zurück">
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          value={note.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Titel"
          className="flex-1 border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Notiz löschen"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
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

      {(error || saveError) && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
          {error ?? `Speichern fehlgeschlagen: ${saveError}`}
        </p>
      )}

      <div
        className={cn(
          "grid gap-4",
          mode === "split" ? "md:grid-cols-2" : "grid-cols-1"
        )}
      >
        {mode !== "preview" && (
          <Textarea
            ref={ref}
            value={content}
            onChange={(e) => onPatch({ content: e.target.value })}
            onPaste={(e) => {
              if (e.clipboardData.files.length > 0) {
                e.preventDefault();
                uploadFiles(e.clipboardData.files);
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
          />
        )}
        {mode !== "edit" && (
          <div className="min-h-[55vh] rounded-md border p-4">
            <NotePreview content={content} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Speichert…
            </>
          ) : saveError ? (
            <>
              <CloudOff className="size-4 text-destructive" /> Nicht gespeichert
            </>
          ) : (
            <>
              <Check className="size-4 text-green-500" /> Gespeichert
            </>
          )}
        </span>
        <Button variant="outline" size="sm" onClick={onFlush} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Cloud className="size-4" />
          )}
          Sichern
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

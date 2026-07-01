"use client";

import * as React from "react";
import {
  Check,
  FileText,
  FolderPlus,
  Layers,
  MoveRight,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { NoteEditor } from "@/components/dashboard/note-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  noteTitle,
  useNotebook,
  type Note,
  type NoteFolder,
} from "@/lib/use-notebook";
import { cn } from "@/lib/utils";

const ALL = "all";

function snippet(note: Note): string {
  return (
    note.content
      .split("\n")
      .slice(1)
      .join(" ")
      .replace(/[#*_>`![\]()-]/g, "")
      .trim()
      .slice(0, 120) || "Keine weiteren Inhalte"
  );
}

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export default function NotesPage() {
  const {
    state,
    ready,
    addFolder,
    renameFolder,
    deleteFolder,
    addNote,
    updateNote,
    deleteNote,
    moveNote,
    saving,
    saveError,
    flush,
  } = useNotebook();

  const [active, setActive] = React.useState<string>(ALL);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  const openNote = state.notes.find((n) => n.id === openId) ?? null;

  const visible = state.notes
    .filter((n) => active === ALL || n.folderId === active)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const countFor = (id: string) =>
    id === ALL
      ? state.notes.length
      : state.notes.filter((n) => n.folderId === id).length;

  function createNote() {
    const folderId = active === ALL ? null : active;
    setOpenId(addNote(folderId));
  }

  if (openNote) {
    return (
      <div>
        <NoteEditor
          note={openNote}
          onPatch={(patch) => updateNote(openNote.id, patch)}
          onBack={() => setOpenId(null)}
          onDelete={() => {
            deleteNote(openNote.id);
            setOpenId(null);
          }}
          saving={saving}
          saveError={saveError}
          onFlush={flush}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notizen"
        description="In benannten Listen organisiert — mit Markdown, Bildern & Link-Vorschau."
      />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Folder rail */}
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            <FolderRow
              icon={<Layers className="size-4" />}
              label="Alle Notizen"
              count={countFor(ALL)}
              active={active === ALL}
              onClick={() => setActive(ALL)}
            />
            {state.folders.map((f) => (
              <FolderRow
                key={f.id}
                label={f.name}
                count={countFor(f.id)}
                active={active === f.id}
                onClick={() => setActive(f.id)}
                folder={f}
                onSave={(name) => renameFolder(f.id, name)}
                onDelete={() => {
                  deleteFolder(f.id);
                  if (active === f.id) setActive(ALL);
                }}
              />
            ))}
            {creatingFolder ? (
              <FolderEditor
                onSave={(name) => {
                  const id = addFolder(name);
                  setCreatingFolder(false);
                  setActive(id);
                }}
                onCancel={() => setCreatingFolder(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground md:mt-1"
              >
                <FolderPlus className="size-4" /> Neue Liste
              </button>
            )}
          </nav>
        </aside>

        {/* Notes list */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={createNote}>
              <Plus className="size-4" /> Neue Notiz
            </Button>
          </div>

          {!ready ? null : visible.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              Keine Notizen hier. Erstelle deine erste.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((note) => (
                <div
                  key={note.id}
                  className="group relative cursor-pointer rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
                  onClick={() => setOpenId(note.id)}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{noteTitle(note)}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {snippet(note)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {dateFmt.format(new Date(note.updatedAt))}
                      </p>
                    </div>
                  </div>

                  <div
                    className="absolute right-2 top-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label="Aktionen"
                        >
                          <MoveRight className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Verschieben nach</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => moveNote(note.id, null)}>
                          Alle Notizen
                        </DropdownMenuItem>
                        {state.folders.map((f) => (
                          <DropdownMenuItem
                            key={f.id}
                            onSelect={() => moveNote(note.id, f.id)}
                          >
                            {f.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => deleteNote(note.id)}
                        >
                          <Trash2 className="size-4" /> Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderRow({
  icon,
  label,
  count,
  active,
  onClick,
  folder,
  onSave,
  onDelete,
}: {
  icon?: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  folder?: NoteFolder;
  onSave?: (name: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = React.useState(false);

  if (editing && folder && onSave) {
    return (
      <FolderEditor
        initial={folder}
        onSave={(name) => {
          onSave(name);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {icon ?? <NotebookPen className="size-4" />}
        <span className="truncate">{label}</span>
      </button>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      {folder ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Liste bearbeiten"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function FolderEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: NoteFolder;
  onSave: (name: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");

  return (
    <div className="shrink-0 space-y-2 rounded-md border bg-card p-2 md:mt-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
        className="flex gap-1"
      >
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Listenname…"
          className="h-8"
        />
        <Button type="submit" size="icon" className="size-8 shrink-0">
          <Check className="size-4" />
        </Button>
      </form>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Abbrechen
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <Trash2 className="size-3" /> Löschen
          </button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Check,
  FolderPlus,
  Globe,
  Inbox,
  Layers,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBookmarks, type Bookmark, type Folder } from "@/lib/use-bookmarks";
import { cn } from "@/lib/utils";

const ALL = "all";
const UNSORTED = "unsorted";

const EMOJIS = [
  "📁", "⭐", "💼", "📚", "🎬", "🎵", "🛠️", "🍔",
  "✈️", "🎮", "💡", "❤️", "🔗", "🧪", "📈", "🌐",
];

function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export default function BookmarksPage() {
  const {
    state,
    ready,
    configured,
    addFolder,
    updateFolder,
    deleteFolder,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    moveBookmark,
    reorderBookmark,
  } = useBookmarks();

  const [active, setActive] = React.useState<string>(ALL);
  const [url, setUrl] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [dragId, setDragId] = React.useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || adding) return;
    setAdding(true);
    const folderId = active === ALL || active === UNSORTED ? null : active;
    try {
      const res = await fetch(
        `/api/link-preview?url=${encodeURIComponent(value)}`
      );
      const p = await res.json();
      addBookmark({
        url: p.url ?? value,
        title: p.title ?? value,
        description: p.description,
        image: p.image,
        favicon: p.favicon,
        siteName: p.siteName,
        folderId,
      });
    } catch {
      addBookmark({
        url: /^https?:\/\//i.test(value) ? value : `https://${value}`,
        title: value,
        folderId,
      });
    } finally {
      setAdding(false);
      setUrl("");
    }
  }

  const inFolder = (b: Bookmark) =>
    active === ALL
      ? true
      : active === UNSORTED
        ? b.folderId === null
        : b.folderId === active;

  const folderBookmarks = state.bookmarks.filter(inFolder);
  const tagsInView = Array.from(
    new Set(folderBookmarks.flatMap((b) => b.tags ?? []))
  ).sort();

  const visible = folderBookmarks.filter((b) => {
    if (activeTag && !(b.tags ?? []).includes(activeTag)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q) ||
      (b.tags ?? []).some((t) => t.includes(q))
    );
  });

  const countFor = (id: string) =>
    id === ALL
      ? state.bookmarks.length
      : id === UNSORTED
        ? state.bookmarks.filter((b) => b.folderId === null).length
        : state.bookmarks.filter((b) => b.folderId === id).length;

  return (
    <div>
      <PageHeader
        title="Lesezeichen"
        description={
          configured
            ? "Links mit Vorschau — synchronisiert über deine Geräte."
            : "Links mit Vorschau sammeln und in Listen organisieren."
        }
      />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Folder rail */}
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            <FolderRow
              icon={<Layers className="size-4" />}
              label="Alle"
              count={countFor(ALL)}
              active={active === ALL}
              onClick={() => setActive(ALL)}
              onDropBookmark={dragId ? () => moveBookmark(dragId, null) : undefined}
            />
            <FolderRow
              icon={<Inbox className="size-4" />}
              label="Unsortiert"
              count={countFor(UNSORTED)}
              active={active === UNSORTED}
              onClick={() => setActive(UNSORTED)}
              onDropBookmark={dragId ? () => moveBookmark(dragId, null) : undefined}
            />

            {state.folders.map((f) => (
              <FolderRow
                key={f.id}
                emoji={f.emoji}
                label={f.name}
                count={countFor(f.id)}
                active={active === f.id}
                onClick={() => setActive(f.id)}
                onDropBookmark={
                  dragId ? () => moveBookmark(dragId, f.id) : undefined
                }
                folder={f}
                onSave={(name, emoji) => updateFolder(f.id, { name, emoji })}
                onDelete={() => {
                  deleteFolder(f.id);
                  if (active === f.id) setActive(ALL);
                }}
              />
            ))}

            {creatingFolder ? (
              <FolderEditor
                onSave={(name, emoji) => {
                  const id = addFolder(name, emoji);
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

        {/* Main */}
        <div className="min-w-0 flex-1">
          <form
            onSubmit={handleAdd}
            className="mb-4 flex flex-col gap-2 sm:flex-row"
          >
            <Input
              placeholder="Link einfügen (z. B. example.com/artikel)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !url.trim()}>
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Hinzufügen
            </Button>
          </form>

          {state.bookmarks.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {tagsInView.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <TagChip
                label="Alle Tags"
                active={activeTag === null}
                onClick={() => setActiveTag(null)}
              />
              {tagsInView.map((t) => (
                <TagChip
                  key={t}
                  label={`#${t}`}
                  active={activeTag === t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                />
              ))}
            </div>
          )}

          {!ready ? null : visible.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              {query || activeTag
                ? "Nichts gefunden."
                : "Noch keine Lesezeichen hier. Füge oben einen Link hinzu."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((b) => (
                <BookmarkCard
                  key={b.id}
                  bookmark={b}
                  folders={state.folders}
                  dragging={dragId === b.id}
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => setDragId(null)}
                  onDropOn={() => {
                    if (dragId) reorderBookmark(dragId, b.id);
                  }}
                  onDelete={() => deleteBookmark(b.id)}
                  onMove={(fid) => moveBookmark(b.id, fid)}
                  onSaveEdit={(patch) => updateBookmark(b.id, patch)}
                  onTagClick={(t) => setActiveTag(t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------ Folder rail ------------------------------ */

function FolderRow({
  icon,
  emoji,
  label,
  count,
  active,
  onClick,
  onDropBookmark,
  folder,
  onSave,
  onDelete,
}: {
  icon?: React.ReactNode;
  emoji?: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onDropBookmark?: () => void;
  folder?: Folder;
  onSave?: (name: string, emoji?: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [dropActive, setDropActive] = React.useState(false);

  if (editing && folder && onSave) {
    return (
      <FolderEditor
        initial={folder}
        onSave={(name, e) => {
          onSave(name, e);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div
      onDragOver={
        onDropBookmark
          ? (e) => {
              e.preventDefault();
              setDropActive(true);
            }
          : undefined
      }
      onDragLeave={() => setDropActive(false)}
      onDrop={
        onDropBookmark
          ? (e) => {
              e.preventDefault();
              setDropActive(false);
              onDropBookmark();
            }
          : undefined
      }
      className={cn(
        "group flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        dropActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {emoji ? <span className="text-sm">{emoji}</span> : icon}
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
  initial?: Folder;
  onSave: (name: string, emoji?: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [emoji, setEmoji] = React.useState(initial?.emoji ?? "📁");

  return (
    <div className="shrink-0 space-y-2 rounded-md border bg-card p-2 md:mt-1">
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={cn(
              "flex size-7 items-center justify-center rounded transition-colors hover:bg-accent",
              emoji === e && "bg-accent ring-1 ring-primary"
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim(), emoji);
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

/* ------------------------------ Bookmark card ------------------------------ */

function BookmarkCard({
  bookmark,
  folders,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onDelete,
  onMove,
  onSaveEdit,
  onTagClick,
}: {
  bookmark: Bookmark;
  folders: Folder[];
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  onSaveEdit: (patch: Partial<Bookmark>) => void;
  onTagClick: (tag: string) => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(bookmark.title);
  const [tagsInput, setTagsInput] = React.useState(
    (bookmark.tags ?? []).join(", ")
  );

  const host = (() => {
    try {
      return new URL(bookmark.url).hostname.replace(/^www\./, "");
    } catch {
      return bookmark.url;
    }
  })();

  function save() {
    onSaveEdit({ title: title.trim() || host, tags: parseTags(tagsInput) });
    setEditing(false);
  }

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn();
      }}
      className={cn(
        "group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md",
        dragging && "opacity-40"
      )}
    >
      <a
        href={bookmark.url}
        target="_blank"
        rel="noreferrer"
        draggable={false}
        className="block cursor-pointer"
      >
        <div className="flex aspect-[1.9/1] items-center justify-center overflow-hidden border-b bg-muted">
          {bookmark.image && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bookmark.image}
              alt=""
              className="size-full object-cover transition-transform group-hover:scale-[1.03]"
              onError={() => setImgOk(false)}
              loading="lazy"
            />
          ) : (
            <Globe className="size-8 text-muted-foreground/50" />
          )}
        </div>
      </a>

      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {bookmark.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bookmark.favicon} alt="" className="size-4 rounded-sm" />
          ) : null}
          <span className="truncate">{bookmark.siteName ?? host}</span>
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel"
              className="h-8"
            />
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags, mit Komma getrennt"
              className="h-8"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7" onClick={save}>
                Speichern
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  setTitle(bookmark.title);
                  setTagsInput((bookmark.tags ?? []).join(", "));
                  setEditing(false);
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              draggable={false}
            >
              <p className="mt-1.5 line-clamp-2 font-medium leading-snug hover:underline">
                {bookmark.title}
              </p>
            </a>
            {bookmark.description ? (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {bookmark.description}
              </p>
            ) : null}
            {(bookmark.tags ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(bookmark.tags ?? []).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTagClick(t)}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-accent"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="size-7 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Aktionen"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="size-4" /> Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Tag className="size-3.5" /> Verschieben
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onMove(null)}>
              <Inbox className="size-4" /> Unsortiert
            </DropdownMenuItem>
            {folders.map((f) => (
              <DropdownMenuItem key={f.id} onSelect={() => onMove(f.id)}>
                <span>{f.emoji ?? "📁"}</span> {f.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-4" /> Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

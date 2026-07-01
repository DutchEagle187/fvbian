"use client";

import * as React from "react";
import {
  Check,
  FolderPlus,
  Globe,
  Inbox,
  Layers,
  Loader2,
  MoveRight,
  Plus,
  Search,
  Trash2,
  X,
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
import { useBookmarks, type Bookmark } from "@/lib/use-bookmarks";
import { cn } from "@/lib/utils";

const ALL = "all";
const UNSORTED = "unsorted";

export default function BookmarksPage() {
  const {
    state,
    ready,
    addFolder,
    deleteFolder,
    addBookmark,
    deleteBookmark,
    moveBookmark,
  } = useBookmarks();

  const [active, setActive] = React.useState<string>(ALL);
  const [url, setUrl] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [newFolder, setNewFolder] = React.useState("");
  const [showFolderInput, setShowFolderInput] = React.useState(false);

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

  function submitFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolder.trim();
    if (!name) return;
    const id = addFolder(name);
    setNewFolder("");
    setShowFolderInput(false);
    setActive(id);
  }

  const visible = state.bookmarks.filter((b) => {
    const inFolder =
      active === ALL
        ? true
        : active === UNSORTED
          ? b.folderId === null
          : b.folderId === active;
    if (!inFolder) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q)
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
        description="Links mit Vorschau sammeln und in Listen organisieren."
      />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Folder rail */}
        <aside className="md:w-52 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            <FolderButton
              icon={<Layers className="size-4" />}
              label="Alle"
              count={countFor(ALL)}
              active={active === ALL}
              onClick={() => setActive(ALL)}
            />
            <FolderButton
              icon={<Inbox className="size-4" />}
              label="Unsortiert"
              count={countFor(UNSORTED)}
              active={active === UNSORTED}
              onClick={() => setActive(UNSORTED)}
            />
            {state.folders.map((f) => (
              <FolderButton
                key={f.id}
                icon={<span className="text-sm">{f.emoji ?? "📁"}</span>}
                label={f.name}
                count={countFor(f.id)}
                active={active === f.id}
                onClick={() => setActive(f.id)}
                onDelete={() => {
                  deleteFolder(f.id);
                  if (active === f.id) setActive(ALL);
                }}
              />
            ))}

            {showFolderInput ? (
              <form onSubmit={submitFolder} className="flex gap-1 md:mt-1">
                <Input
                  autoFocus
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onBlur={() => !newFolder && setShowFolderInput(false)}
                  placeholder="Listenname…"
                  className="h-8"
                />
                <Button type="submit" size="icon" className="size-8 shrink-0">
                  <Check className="size-4" />
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowFolderInput(true)}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground md:mt-1"
              >
                <FolderPlus className="size-4" /> Neue Liste
              </button>
            )}
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 sm:flex-row">
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
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {!ready ? null : visible.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              {query
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
                  onDelete={() => deleteBookmark(b.id)}
                  onMove={(fid) => moveBookmark(b.id, fid)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderButton({
  icon,
  label,
  count,
  active,
  onClick,
  onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
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
        {icon}
        <span className="truncate">{label}</span>
      </button>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Liste löschen"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function BookmarkCard({
  bookmark,
  folders,
  onDelete,
  onMove,
}: {
  bookmark: Bookmark;
  folders: { id: string; name: string; emoji?: string }[];
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const host = (() => {
    try {
      return new URL(bookmark.url).hostname.replace(/^www\./, "");
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <Card className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      <a href={bookmark.url} target="_blank" rel="noreferrer" className="block">
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
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {bookmark.favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bookmark.favicon} alt="" className="size-4 rounded-sm" />
            ) : null}
            <span className="truncate">{bookmark.siteName ?? host}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 font-medium leading-snug">
            {bookmark.title}
          </p>
          {bookmark.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {bookmark.description}
            </p>
          ) : null}
        </div>
      </a>

      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="size-7 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Aktionen"
            >
              <MoveRight className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Verschieben nach</DropdownMenuLabel>
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

"use client";

import * as React from "react";
import { BookOpen, Clapperboard, Film, Plus, Star, Trash2, Tv } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { WatchlistAddDialog } from "@/components/dashboard/watchlist-add-dialog";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/magicui/blur-fade";
import {
  useWatchlist,
  type MediaType,
  type WatchItem,
  type WatchStatus,
} from "@/lib/use-watchlist";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: { key: MediaType | "all"; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "movie", label: "Filme" },
  { key: "tv", label: "Serien" },
  { key: "book", label: "Bücher" },
];

const STATUS: { key: WatchStatus; label: string }[] = [
  { key: "planned", label: "Geplant" },
  { key: "active", label: "Dabei" },
  { key: "done", label: "Fertig" },
];

const TYPE_ICON = { movie: Film, tv: Tv, book: BookOpen };

export default function WatchlistPage() {
  const { items, ready, add, updateItem, remove } = useWatchlist();
  const [typeFilter, setTypeFilter] = React.useState<MediaType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<WatchStatus | "all">(
    "all"
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const visible = items.filter(
    (i) =>
      (typeFilter === "all" || i.type === typeFilter) &&
      (statusFilter === "all" || i.status === statusFilter)
  );

  return (
    <div>
      <PageHeader
        title="Watchlist"
        description="Filme, Serien & Bücher — was du noch schauen oder lesen willst."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={typeFilter === t.key ? "default" : "outline"}
              onClick={() => setTypeFilter(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Hinzufügen
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-1">
        <Button
          size="sm"
          variant={statusFilter === "all" ? "secondary" : "ghost"}
          onClick={() => setStatusFilter("all")}
        >
          Alle Status
        </Button>
        {STATUS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={statusFilter === s.key ? "secondary" : "ghost"}
            onClick={() => setStatusFilter(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {!ready ? null : visible.length === 0 ? (
        <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Noch nichts auf der Liste. Füge deinen ersten Titel hinzu."
            : "Nichts in diesem Filter."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item, i) => (
            <BlurFade key={item.id} delay={Math.min(i * 0.03, 0.3)} inView>
              <WatchCard
                item={item}
                onStatus={(status) => updateItem(item.id, { status })}
                onRating={(rating) => updateItem(item.id, { rating })}
                onDelete={() => remove(item.id)}
              />
            </BlurFade>
          ))}
        </div>
      )}

      <WatchlistAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={(r) => {
          if (r.sourceId && items.some((i) => i.sourceId === r.sourceId)) return;
          add({
            type: r.type,
            title: r.title,
            year: r.year,
            poster: r.poster,
            subtitle: r.subtitle,
            sourceId: r.sourceId,
            status: "planned",
          });
        }}
      />
    </div>
  );
}

function WatchCard({
  item,
  onStatus,
  onRating,
  onDelete,
}: {
  item: WatchItem;
  onStatus: (status: WatchStatus) => void;
  onRating: (rating: number) => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? Clapperboard;

  return (
    <div className="group overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-[2/3] bg-muted">
        {item.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Icon className="size-10 text-muted-foreground/40" />
          </div>
        )}
        <button
          type="button"
          onClick={onDelete}
          aria-label="Entfernen"
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
        <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-background/80 shadow-sm backdrop-blur">
          <Icon className="size-3.5" />
        </span>
      </div>

      <div className="space-y-2 p-2.5">
        <div>
          <p className="line-clamp-1 text-sm font-medium" title={item.title}>
            {item.title}
          </p>
          {item.year && (
            <p className="text-xs text-muted-foreground">{item.year}</p>
          )}
        </div>

        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onRating(item.rating === n ? 0 : n)}
              aria-label={`${n} Sterne`}
            >
              <Star
                className={cn(
                  "size-3.5 transition-colors",
                  (item.rating ?? 0) >= n
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/40 hover:text-yellow-400"
                )}
              />
            </button>
          ))}
        </div>

        <select
          value={item.status}
          onChange={(e) => onStatus(e.target.value as WatchStatus)}
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

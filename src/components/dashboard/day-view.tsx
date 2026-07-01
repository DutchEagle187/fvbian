"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CalEvent } from "@/lib/use-calendar";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 48; // px per hour
const START_HOUR = 0;
const END_HOUR = 24;

const timeFmt = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});
const headerFmt = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

interface Positioned {
  ev: CalEvent;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

function computeLayout(
  items: { ev: CalEvent; startMin: number; endMin: number }[]
): Positioned[] {
  const sorted = [...items].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
  );
  const result: Positioned[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -1;

  const flush = () => {
    const colEnds: number[] = [];
    const placed: { it: (typeof sorted)[0]; col: number }[] = [];
    for (const it of cluster) {
      let c = 0;
      while (c < colEnds.length && colEnds[c] > it.startMin) c++;
      colEnds[c] = it.endMin;
      placed.push({ it, col: c });
    }
    for (const p of placed) {
      result.push({
        ev: p.it.ev,
        startMin: p.it.startMin,
        endMin: p.it.endMin,
        col: p.col,
        cols: colEnds.length,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of sorted) {
    if (cluster.length && it.startMin >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  if (cluster.length) flush();
  return result;
}

export function DayView({
  date,
  events,
  onPrev,
  onNext,
  onToday,
  onEventClick,
  onCreateAt,
}: {
  date: Date;
  events: CalEvent[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onEventClick: (ev: CalEvent) => void;
  onCreateAt: (start: Date) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const inDay = events.filter((e) => {
    const s = new Date(e.start);
    const en = new Date(e.end);
    return s < dayEnd && en > dayStart;
  });
  const allDay = inDay.filter((e) => e.allDay);
  const timed = inDay.filter((e) => !e.allDay);

  const positioned = computeLayout(
    timed.map((ev) => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      const startMin = Math.max(
        0,
        (s.getTime() - dayStart.getTime()) / 60000
      );
      const endMin = Math.min(
        1440,
        (e.getTime() - dayStart.getTime()) / 60000
      );
      return { ev, startMin, endMin: Math.max(endMin, startMin + 15) };
    })
  );

  const isToday = (() => {
    const t = new Date();
    return (
      t.getFullYear() === date.getFullYear() &&
      t.getMonth() === date.getMonth() &&
      t.getDate() === date.getDate()
    );
  })();

  // Scroll to the earliest event (or 7:00) on day change.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstMin = positioned.length
      ? Math.min(...positioned.map((p) => p.startMin))
      : 7 * 60;
    el.scrollTop = Math.max(0, (firstMin / 60) * HOUR_HEIGHT - HOUR_HEIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.getTime()]);

  const nowMin = (() => {
    const t = new Date();
    return t.getHours() * 60 + t.getMinutes();
  })();

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Vorheriger Tag">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Heute
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Nächster Tag">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className={cn("text-sm font-medium capitalize", isToday && "text-primary")}>
          {headerFmt.format(date)}
        </span>
      </div>

      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b p-2">
          {allDay.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onEventClick(ev)}
              className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: ev.color ?? "var(--primary)" }}
              />
              {ev.title}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto">
        <div
          className="relative"
          style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
        >
          {/* Hour lines + click-to-create cells */}
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
            const hour = START_HOUR + i;
            return (
              <div
                key={hour}
                className="absolute right-0 left-14 cursor-pointer border-t border-border/60 hover:bg-accent/30"
                style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => {
                  const d = new Date(dayStart);
                  d.setHours(hour, 0, 0, 0);
                  onCreateAt(d);
                }}
              >
                <span className="absolute -top-2 -left-14 w-12 text-right text-xs text-muted-foreground">
                  {hour.toString().padStart(2, "0")}:00
                </span>
              </div>
            );
          })}

          {/* Now indicator */}
          {isToday && (
            <div
              className="pointer-events-none absolute right-0 left-14 z-10 border-t-2 border-red-500"
              style={{ top: (nowMin / 60) * HOUR_HEIGHT }}
            >
              <span className="absolute -top-1 -left-1 size-2 rounded-full bg-red-500" />
            </div>
          )}

          {/* Events */}
          {positioned.map((p) => {
            const top = (p.startMin / 60) * HOUR_HEIGHT;
            const height = ((p.endMin - p.startMin) / 60) * HOUR_HEIGHT;
            const widthPct = 100 / p.cols;
            return (
              <button
                key={p.ev.id}
                onClick={() => onEventClick(p.ev)}
                className="absolute z-10 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-xs shadow-sm"
                style={{
                  top,
                  height: Math.max(height - 2, 16),
                  left: `calc(3.5rem + (100% - 3.5rem) * ${p.col * widthPct} / 100)`,
                  width: `calc((100% - 3.5rem) * ${widthPct} / 100 - 2px)`,
                  backgroundColor: (p.ev.color ?? "var(--primary)") + "22",
                  borderColor: p.ev.color ?? "var(--primary)",
                }}
              >
                <span className="block truncate font-medium">{p.ev.title}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {timeFmt.format(new Date(p.ev.start))}
                  {p.ev.location ? ` · ${p.ev.location}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

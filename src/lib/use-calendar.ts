"use client";

import * as React from "react";

import type { CalEvent } from "@/lib/caldav";

export type { CalEvent };

interface EventsResponse {
  connected: boolean;
  events: CalEvent[];
  error?: string;
}

export function useCalendarEvents(days: number) {
  const [data, setData] = React.useState<EventsResponse>({
    connected: false,
    events: [],
  });
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/calendar/events?days=${days}`)
      .then((r) => r.json())
      .then((res: EventsResponse) => setData(res))
      .catch(() => setData({ connected: false, events: [] }))
      .finally(() => setLoading(false));
  }, [days]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, reload };
}

/* ------------------------------- formatting ------------------------------- */

const dayKeyFmt = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

export interface EventDay {
  key: string;
  label: string;
  isToday: boolean;
  events: CalEvent[];
}

/** Group events by calendar day (local), preserving chronological order. */
export function groupByDay(events: CalEvent[]): EventDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const map = new Map<string, EventDay>();
  for (const ev of events) {
    const d = new Date(ev.start);
    const key = d.toDateString();
    if (!map.has(key)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      map.set(key, {
        key,
        label: dayKeyFmt.format(d),
        isToday: dayStart.getTime() === today.getTime(),
        events: [],
      });
    }
    map.get(key)!.events.push(ev);
  }
  return Array.from(map.values());
}

export function formatEventTime(ev: CalEvent): string {
  if (ev.allDay) return "ganztägig";
  return timeFmt.format(new Date(ev.start));
}


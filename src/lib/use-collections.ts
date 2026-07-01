"use client";

import * as React from "react";

import type { CalendarCollection } from "@/lib/caldav";

export type { CalendarCollection };

export function useCollections() {
  const [collections, setCollections] = React.useState<CalendarCollection[]>(
    []
  );

  React.useEffect(() => {
    fetch("/api/calendar/calendars")
      .then((r) => r.json())
      .then((res: { collections?: CalendarCollection[] }) =>
        setCollections(res.collections ?? [])
      )
      .catch(() => setCollections([]));
  }, []);

  return {
    eventCalendars: collections.filter((c) => c.kind === "event"),
    reminderLists: collections.filter((c) => c.kind === "reminder"),
  };
}

"use client";

import * as React from "react";

import type { Reminder } from "@/lib/caldav";

export type { Reminder };

interface RemindersResponse {
  connected: boolean;
  reminders: Reminder[];
  error?: string;
}

export function useReminders() {
  const [data, setData] = React.useState<RemindersResponse>({
    connected: false,
    reminders: [],
  });
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(() => {
    setLoading(true);
    fetch("/api/calendar/reminders")
      .then((r) => r.json())
      .then((res: RemindersResponse) => setData(res))
      .catch(() => setData({ connected: false, reminders: [] }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const toggle = React.useCallback(
    async (reminder: Reminder, done: boolean) => {
      // Optimistic update.
      setData((d) => ({
        ...d,
        reminders: d.reminders.map((r) =>
          r.id === reminder.id ? { ...r, completed: done } : r
        ),
      }));
      try {
        const res = await fetch("/api/calendar/reminders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: reminder.url,
            calendarUrl: reminder.calendarUrl,
            done,
          }),
        });
        if (!res.ok) throw new Error("failed");
      } catch {
        // Revert on failure.
        setData((d) => ({
          ...d,
          reminders: d.reminders.map((r) =>
            r.id === reminder.id ? { ...r, completed: !done } : r
          ),
        }));
      }
    },
    []
  );

  return { ...data, loading, reload, toggle };
}

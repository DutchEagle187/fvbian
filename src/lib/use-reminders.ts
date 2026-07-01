"use client";

import * as React from "react";

import type { Reminder, ReminderInput } from "@/lib/caldav";

export type { Reminder, ReminderInput };

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
          method: "PATCH",
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

  const create = React.useCallback(
    async (calendarUrl: string, reminder: ReminderInput) => {
      const res = await fetch("/api/calendar/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calendarUrl, reminder }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      reload();
    },
    [reload]
  );

  const update = React.useCallback(
    async (
      target: { url: string; calendarUrl: string },
      reminder: ReminderInput
    ) => {
      const res = await fetch("/api/calendar/reminders", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...target, reminder }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      reload();
    },
    [reload]
  );

  const remove = React.useCallback(
    async (target: { url: string; calendarUrl: string }) => {
      const res = await fetch("/api/calendar/reminders", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      reload();
    },
    [reload]
  );

  return { ...data, loading, reload, toggle, create, update, remove };
}

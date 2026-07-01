"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CalEvent, EventInput } from "@/lib/use-calendar";
import type { CalendarCollection } from "@/lib/use-collections";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toDateTimeInput(iso: string) {
  const d = new Date(iso);
  return `${toDateInput(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:00`;
}

export function EventDialog({
  open,
  onOpenChange,
  calendars,
  initial,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: CalendarCollection[];
  initial?: CalEvent;
  onSubmit: (calendarUrl: string, event: EventInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const editing = !!initial;
  const readOnly = !!initial?.recurring;
  const [calendarUrl, setCalendarUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [allDay, setAllDay] = React.useState(false);
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setCalendarUrl(initial.calendarUrl);
      setTitle(initial.title);
      setAllDay(initial.allDay);
      if (initial.allDay) {
        setStart(toDateInput(initial.start));
        // Stored end is exclusive → show inclusive last day.
        const endIncl = new Date(initial.end);
        endIncl.setDate(endIncl.getDate() - 1);
        setEnd(toDateInput(endIncl.toISOString()));
      } else {
        setStart(toDateTimeInput(initial.start));
        setEnd(toDateTimeInput(initial.end));
      }
      setLocation(initial.location ?? "");
      setNotes(initial.notes ?? "");
    } else {
      setCalendarUrl(calendars[0]?.url ?? "");
      setTitle("");
      setAllDay(false);
      setStart(defaultStart());
      const e = new Date();
      e.setMinutes(0, 0, 0);
      e.setHours(e.getHours() + 2);
      setEnd(
        `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(
          e.getHours()
        )}:00`
      );
      setLocation("");
      setNotes("");
    }
  }, [open, initial, calendars]);

  // Switching all-day flips the input formats to something valid.
  function toggleAllDay(next: boolean) {
    setAllDay(next);
    if (next) {
      setStart((s) => (s.includes("T") ? s.slice(0, 10) : s));
      setEnd((s) => (s.includes("T") ? s.slice(0, 10) : s));
    } else {
      setStart((s) => (s.includes("T") ? s : `${s}T09:00`));
      setEnd((s) => (s.includes("T") ? s : `${s}T10:00`));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start || !calendarUrl) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(calendarUrl, {
        title: title.trim(),
        allDay,
        start,
        end: end || start,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!onDelete) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Termin bearbeiten" : "Neuer Termin"}
          </DialogTitle>
        </DialogHeader>

        {readOnly && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
            Serientermin – zum Bearbeiten die Apple-Kalender-App nutzen. Hier
            lässt sich nur die gesamte Serie löschen.
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={readOnly} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Titel</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-cal">Kalender</Label>
            <select
              id="ev-cal"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              disabled={editing}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {calendars.map((c) => (
                <option key={c.url} value={c.url}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => toggleAllDay(e.target.checked)}
              className="size-4"
            />
            Ganztägig
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev-start">Beginn</Label>
              <Input
                id="ev-start"
                type={allDay ? "date" : "datetime-local"}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">Ende</Label>
              <Input
                id="ev-end"
                type={allDay ? "date" : "datetime-local"}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-loc">Ort</Label>
            <Input
              id="ev-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-notes">Notizen</Label>
            <Textarea
              id="ev-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>
          </fieldset>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            {editing && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={del}
                disabled={busy}
              >
                <Trash2 className="size-4" /> Löschen
              </Button>
            ) : (
              <span />
            )}
            {!readOnly && (
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {editing ? "Speichern" : "Erstellen"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

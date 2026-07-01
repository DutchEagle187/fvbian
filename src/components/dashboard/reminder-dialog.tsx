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
import type { Reminder, ReminderInput } from "@/lib/use-reminders";
import type { CalendarCollection } from "@/lib/use-collections";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateTimeInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const PRIORITIES = [
  { label: "Keine", value: 0 },
  { label: "Hoch", value: 1 },
  { label: "Mittel", value: 5 },
  { label: "Niedrig", value: 9 },
];

export function ReminderDialog({
  open,
  onOpenChange,
  lists,
  initial,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: CalendarCollection[];
  initial?: Reminder;
  onSubmit: (calendarUrl: string, reminder: ReminderInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const editing = !!initial;
  const [calendarUrl, setCalendarUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [due, setDue] = React.useState("");
  const [priority, setPriority] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setCalendarUrl(initial.calendarUrl);
      setTitle(initial.title);
      setNotes(initial.notes ?? "");
      setDue(initial.due ? toDateTimeInput(initial.due) : "");
      setPriority(initial.priority ?? 0);
    } else {
      setCalendarUrl(lists[0]?.url ?? "");
      setTitle("");
      setNotes("");
      setDue("");
      setPriority(0);
    }
  }, [open, initial, lists]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !calendarUrl) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(calendarUrl, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        due: due ? new Date(due).toISOString() : null,
        priority,
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
            {editing ? "Erinnerung bearbeiten" : "Neue Erinnerung"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rm-title">Titel</Label>
            <Input
              id="rm-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rm-list">Liste</Label>
            <select
              id="rm-list"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              disabled={editing}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {lists.map((c) => (
                <option key={c.url} value={c.url}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rm-due">Fällig</Label>
              <Input
                id="rm-due"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rm-prio">Priorität</Label>
              <select
                id="rm-prio"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rm-notes">Notizen</Label>
            <Textarea
              id="rm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

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
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

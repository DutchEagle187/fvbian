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
import type { Task, TaskInput, TaskList } from "@/lib/use-tasks";

function toDateInput(due?: string | null) {
  if (!due) return "";
  return new Date(due).toISOString().slice(0, 10);
}

export function TaskDialog({
  open,
  onOpenChange,
  lists,
  initial,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: TaskList[];
  initial?: Task;
  onSubmit: (listId: string, task: TaskInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const editing = !!initial;
  const [listId, setListId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setListId(initial.listId);
      setTitle(initial.title);
      setDue(toDateInput(initial.due));
      setNotes(initial.notes ?? "");
    } else {
      setListId(lists[0]?.id ?? "");
      setTitle("");
      setDue("");
      setNotes("");
    }
  }, [open, initial, lists]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !listId) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(listId, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        due: due || null,
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
            {editing ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tk-title">Titel</Label>
            <Input
              id="tk-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tk-list">Liste</Label>
              <select
                id="tk-list"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                disabled={editing}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tk-due">Fällig</Label>
              <Input
                id="tk-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tk-notes">Notizen</Label>
            <Textarea
              id="tk-notes"
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

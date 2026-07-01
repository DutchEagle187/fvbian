"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ReminderDialog } from "@/components/dashboard/reminder-dialog";
import { Button } from "@/components/ui/button";
import { useReminders, type Reminder } from "@/lib/use-reminders";
import { useCollections } from "@/lib/use-collections";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "short",
});

function dueLabel(due: string): { text: string; overdue: boolean } {
  const d = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const overdue = diff < 0;
  if (diff === 0) return { text: "heute", overdue: false };
  if (diff === 1) return { text: "morgen", overdue: false };
  if (diff === -1) return { text: "gestern", overdue: true };
  return { text: dateFmt.format(d), overdue };
}

export default function RemindersPage() {
  const {
    connected,
    reminders,
    loading,
    error,
    reload,
    toggle,
    create,
    update,
    remove,
  } = useReminders();
  const { reminderLists } = useCollections();
  const [showDone, setShowDone] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Reminder | undefined>();

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(r: Reminder) {
    setEditing(r);
    setDialogOpen(true);
  }

  const lists = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; color?: string; items: Reminder[] }
    >();
    for (const r of reminders) {
      if (!map.has(r.list)) {
        map.set(r.list, { name: r.list, color: r.listColor, items: [] });
      }
      map.get(r.list)!.items.push(r);
    }
    for (const l of map.values()) {
      l.items.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return a.title.localeCompare(b.title);
      });
    }
    return Array.from(map.values());
  }, [reminders]);

  const openCount = reminders.filter((r) => !r.completed).length;

  return (
    <div>
      <PageHeader
        title="Erinnerungen"
        description="Deine iCloud-Erinnerungen — abhaken wird zurück nach iCloud geschrieben."
      />

      {loading && reminders.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Erinnerungen werden
          geladen…
        </div>
      ) : !connected ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Verbinde zuerst deinen{" "}
          <Link
            href="/dashboard/tools/calendar"
            className="underline underline-offset-4"
          >
            iCloud-Kalender
          </Link>
          . Erinnerungen nutzen denselben Zugang.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {openCount} offen
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={openCreate}
                disabled={!reminderLists.length}
              >
                <Plus className="size-4" /> Neue Erinnerung
              </Button>
              <Button
                size="sm"
                variant={showDone ? "default" : "outline"}
                onClick={() => setShowDone((s) => !s)}
              >
                Erledigte {showDone ? "ausblenden" : "anzeigen"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={reload}
                disabled={loading}
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Aktualisieren
              </Button>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {lists.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              Keine Erinnerungen gefunden.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {lists.map((list) => {
                const items = list.items.filter(
                  (r) => showDone || !r.completed
                );
                if (items.length === 0) return null;
                return (
                  <div key={list.name}>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: list.color ?? "var(--primary)",
                        }}
                      />
                      {list.name}
                    </h3>
                    <ul className="space-y-1">
                      {items.map((r) => (
                        <ReminderRow
                          key={r.id}
                          reminder={r}
                          onToggle={toggle}
                          onEdit={openEdit}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lists={reminderLists}
        initial={editing}
        onSubmit={(calendarUrl, reminder) =>
          editing
            ? update(
                { url: editing.url, calendarUrl: editing.calendarUrl },
                reminder
              )
            : create(calendarUrl, reminder)
        }
        onDelete={
          editing
            ? () =>
                remove({
                  url: editing.url,
                  calendarUrl: editing.calendarUrl,
                })
            : undefined
        }
      />
    </div>
  );
}

function ReminderRow({
  reminder,
  onToggle,
  onEdit,
}: {
  reminder: Reminder;
  onToggle: (r: Reminder, done: boolean) => void;
  onEdit: (r: Reminder) => void;
}) {
  const due = reminder.due ? dueLabel(reminder.due) : null;
  const highPriority =
    typeof reminder.priority === "number" &&
    reminder.priority > 0 &&
    reminder.priority <= 4;

  return (
    <li className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-accent/50">
      <button
        type="button"
        onClick={() => onToggle(reminder, !reminder.completed)}
        aria-label={reminder.completed ? "Als offen markieren" : "Abhaken"}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          reminder.completed
            ? "border-green-500 bg-green-500 text-white"
            : "border-input hover:border-foreground"
        )}
      >
        {reminder.completed ? <Check className="size-3.5" /> : null}
      </button>
      <button
        type="button"
        onClick={() => onEdit(reminder)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={cn(
            "text-sm leading-snug",
            reminder.completed && "text-muted-foreground line-through"
          )}
        >
          {highPriority && !reminder.completed ? (
            <span className="mr-1 font-semibold text-destructive">!</span>
          ) : null}
          {reminder.title}
        </p>
        {reminder.notes ? (
          <p className="truncate text-xs text-muted-foreground">
            {reminder.notes}
          </p>
        ) : null}
      </button>
      {due && !reminder.completed ? (
        <span
          className={cn(
            "mt-0.5 shrink-0 text-xs tabular-nums",
            due.overdue ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {due.text}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => onEdit(reminder)}
        aria-label="Bearbeiten"
        className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="size-3.5" />
      </button>
    </li>
  );
}

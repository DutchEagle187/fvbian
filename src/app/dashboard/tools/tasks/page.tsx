"use client";

import * as React from "react";
import { Check, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { TaskDialog } from "@/components/dashboard/task-dialog";
import { Button } from "@/components/ui/button";
import { reconnectGoogleAction } from "@/app/actions/auth";
import { useTasks, type Task } from "@/lib/use-tasks";
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

export default function TasksPage() {
  const {
    connected,
    lists,
    tasks,
    loading,
    error,
    reload,
    toggle,
    create,
    update,
    remove,
  } = useTasks();
  const [showDone, setShowDone] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | undefined>();

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(t: Task) {
    setEditing(t);
    setDialogOpen(true);
  }

  const grouped = React.useMemo(() => {
    return lists
      .map((l) => ({
        ...l,
        items: tasks
          .filter((t) => t.listId === l.id)
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.due && b.due) return a.due.localeCompare(b.due);
            if (a.due) return -1;
            if (b.due) return 1;
            return a.title.localeCompare(b.title);
          }),
      }))
      .filter((l) => l.items.length > 0);
  }, [lists, tasks]);

  const openCount = tasks.filter((t) => !t.completed).length;

  return (
    <div>
      <PageHeader
        title="Aufgaben"
        description="Google Tasks — anlegen, bearbeiten, abhaken. Synchron mit all deinen Geräten."
      />

      {loading && tasks.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Aufgaben werden geladen…
        </div>
      ) : !connected ? (
        <div className="max-w-md rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          <p className="mb-3">
            Um Google Tasks zu nutzen, musst du dich einmal neu anmelden und den
            Zugriff auf „Aufgaben“ freigeben.
          </p>
          <form action={reconnectGoogleAction}>
            <Button type="submit" size="sm">
              Mit Google verbinden
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {openCount} offen
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={openCreate} disabled={!lists.length}>
                <Plus className="size-4" /> Neue Aufgabe
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

          {grouped.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              Keine Aufgaben. Leg oben deine erste an.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {grouped.map((list) => {
                const items = list.items.filter(
                  (t) => showDone || !t.completed
                );
                if (items.length === 0) return null;
                return (
                  <div key={list.id}>
                    <h3 className="mb-2 text-sm font-semibold">{list.title}</h3>
                    <ul className="space-y-1">
                      {items.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
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

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lists={lists}
        initial={editing}
        onSubmit={(listId, task) =>
          editing
            ? update(editing.listId, editing.id, task)
            : create(listId, task)
        }
        onDelete={
          editing ? () => remove(editing.listId, editing.id) : undefined
        }
      />
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
}: {
  task: Task;
  onToggle: (t: Task, done: boolean) => void;
  onEdit: (t: Task) => void;
}) {
  const due = task.due ? dueLabel(task.due) : null;

  return (
    <li className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-accent/50">
      <button
        type="button"
        onClick={() => onToggle(task, !task.completed)}
        aria-label={task.completed ? "Als offen markieren" : "Abhaken"}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.completed
            ? "border-green-500 bg-green-500 text-white"
            : "border-input hover:border-foreground"
        )}
      >
        {task.completed ? <Check className="size-3.5" /> : null}
      </button>
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={cn(
            "text-sm leading-snug",
            task.completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.notes ? (
          <p className="truncate text-xs text-muted-foreground">{task.notes}</p>
        ) : null}
      </button>
      {due && !task.completed ? (
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
        onClick={() => onEdit(task)}
        aria-label="Bearbeiten"
        className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="size-3.5" />
      </button>
    </li>
  );
}

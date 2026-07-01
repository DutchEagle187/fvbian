"use client";

import * as React from "react";

import type { Task, TaskList, TaskInput } from "@/lib/google-tasks";

export type { Task, TaskList, TaskInput };

interface TasksResponse {
  connected: boolean;
  lists: TaskList[];
  tasks: Task[];
  error?: string;
}

export function useTasks() {
  const [data, setData] = React.useState<TasksResponse>({
    connected: false,
    lists: [],
    tasks: [],
  });
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(() => {
    setLoading(true);
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((res: TasksResponse) => setData(res))
      .catch(() => setData({ connected: false, lists: [], tasks: [] }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const toggle = React.useCallback(async (task: Task, done: boolean) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === task.id ? { ...t, completed: done } : t
      ),
    }));
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId: task.listId, taskId: task.id, done }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setData((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === task.id ? { ...t, completed: !done } : t
        ),
      }));
    }
  }, []);

  const create = React.useCallback(
    async (listId: string, task: TaskInput) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId, task }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      reload();
    },
    [reload]
  );

  const update = React.useCallback(
    async (listId: string, taskId: string, task: TaskInput) => {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId, taskId, task }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      reload();
    },
    [reload]
  );

  const remove = React.useCallback(
    async (listId: string, taskId: string) => {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId, taskId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      reload();
    },
    [reload]
  );

  return { ...data, loading, reload, toggle, create, update, remove };
}

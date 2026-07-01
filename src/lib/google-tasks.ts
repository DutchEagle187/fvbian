const API = "https://tasks.googleapis.com/tasks/v1";

export interface TaskList {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  due?: string | null; // RFC3339 (Google stores date only)
  completed: boolean;
}

export interface TaskInput {
  title: string;
  notes?: string;
  due?: string | null; // "YYYY-MM-DD" or null
}

async function gfetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Tasks ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

export async function listTaskLists(accessToken: string): Promise<TaskList[]> {
  const data = await gfetch<{ items?: { id: string; title: string }[] }>(
    accessToken,
    "/users/@me/lists"
  );
  return (data?.items ?? []).map((l) => ({ id: l.id, title: l.title }));
}

export async function listAllTasks(
  accessToken: string
): Promise<{ lists: TaskList[]; tasks: Task[] }> {
  const lists = await listTaskLists(accessToken);
  const tasks: Task[] = [];

  await Promise.all(
    lists.map(async (l) => {
      const data = await gfetch<{
        items?: {
          id: string;
          title?: string;
          notes?: string;
          due?: string;
          status?: string;
        }[];
      }>(
        accessToken,
        `/lists/${l.id}/tasks?showCompleted=true&showHidden=true&maxResults=100`
      );
      for (const t of data?.items ?? []) {
        tasks.push({
          id: t.id,
          listId: l.id,
          title: t.title || "(ohne Titel)",
          notes: t.notes || undefined,
          due: t.due ?? null,
          completed: t.status === "completed",
        });
      }
    })
  );

  return { lists, tasks };
}

function taskBody(input: TaskInput): Record<string, unknown> {
  const body: Record<string, unknown> = { title: input.title };
  if (input.notes !== undefined) body.notes = input.notes ?? "";
  if (input.due !== undefined) {
    body.due = input.due ? new Date(`${input.due}T00:00:00Z`).toISOString() : null;
  }
  return body;
}

export async function createTask(
  accessToken: string,
  listId: string,
  input: TaskInput
): Promise<void> {
  await gfetch(accessToken, `/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify(taskBody(input)),
  });
}

export async function updateTask(
  accessToken: string,
  listId: string,
  taskId: string,
  input: TaskInput
): Promise<void> {
  await gfetch(accessToken, `/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(taskBody(input)),
  });
}

export async function setTaskCompleted(
  accessToken: string,
  listId: string,
  taskId: string,
  done: boolean
): Promise<void> {
  await gfetch(accessToken, `/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(
      done ? { status: "completed" } : { status: "needsAction" }
    ),
  });
}

export async function deleteTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  await gfetch(accessToken, `/lists/${listId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

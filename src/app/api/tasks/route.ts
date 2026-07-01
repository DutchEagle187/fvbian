import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  createTask,
  deleteTask,
  listAllTasks,
  setTaskCompleted,
  updateTask,
  type TaskInput,
} from "@/lib/google-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireToken() {
  const session = await auth();
  if (!session?.user) return { error: "unauthorized" as const, status: 401 };
  if (session.error || !session.accessToken) {
    return { error: "reauth" as const, status: 200 };
  }
  return { token: session.accessToken };
}

function validTask(t: unknown): TaskInput | null {
  const v = t as Partial<TaskInput> | undefined;
  if (!v || typeof v.title !== "string" || !v.title.trim()) return null;
  return {
    title: v.title.trim(),
    notes: typeof v.notes === "string" ? v.notes : undefined,
    due: typeof v.due === "string" && v.due ? v.due : null,
  };
}

export async function GET() {
  const ctx = await requireToken();
  if ("error" in ctx) {
    if (ctx.error === "reauth") {
      return NextResponse.json({ connected: false, lists: [], tasks: [] });
    }
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  try {
    const { lists, tasks } = await listAllTasks(ctx.token);
    return NextResponse.json({ connected: true, lists, tasks });
  } catch (e) {
    return NextResponse.json(
      { connected: true, lists: [], tasks: [], error: (e as Error).message },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await requireToken();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const body = await request.json().catch(() => ({}));
  const task = validTask(body.task);
  if (!body.listId || !task) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  try {
    await createTask(ctx.token, body.listId, task);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const ctx = await requireToken();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.listId || !body.taskId) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }
  try {
    if (typeof body.done === "boolean") {
      await setTaskCompleted(ctx.token, body.listId, body.taskId, body.done);
    } else {
      const task = validTask(body.task);
      if (!task) {
        return NextResponse.json({ error: "invalid input" }, { status: 400 });
      }
      await updateTask(ctx.token, body.listId, body.taskId, task);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const ctx = await requireToken();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.listId || !body.taskId) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }
  try {
    await deleteTask(ctx.token, body.listId, body.taskId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

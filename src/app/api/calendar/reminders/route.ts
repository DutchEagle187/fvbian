import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  createReminder,
  deleteObject,
  fetchReminders,
  getCreds,
  toggleReminder,
  updateReminder,
  type ReminderInput,
} from "@/lib/caldav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireCreds() {
  const session = await auth();
  if (!session?.user?.email) return { error: "unauthorized" as const };
  const creds = await getCreds(session.user.email);
  if (!creds) return { error: "not connected" as const };
  return { creds };
}

function validReminder(r: unknown): ReminderInput | null {
  const v = r as Partial<ReminderInput> | undefined;
  if (!v || typeof v.title !== "string" || !v.title.trim()) return null;
  return {
    title: v.title,
    notes: typeof v.notes === "string" ? v.notes : undefined,
    due: typeof v.due === "string" && v.due ? v.due : null,
    priority: typeof v.priority === "number" ? v.priority : undefined,
  };
}

export async function GET() {
  const ctx = await requireCreds();
  if ("error" in ctx) {
    if (ctx.error === "not connected") {
      return NextResponse.json({ connected: false, reminders: [] });
    }
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }
  try {
    const reminders = await fetchReminders(ctx.creds);
    return NextResponse.json({ connected: true, reminders });
  } catch (e) {
    return NextResponse.json(
      {
        connected: true,
        reminders: [],
        error:
          (e as Error).message || "Erinnerungen konnten nicht geladen werden.",
      },
      { status: 502 }
    );
  }
}

// Toggle completion.
export async function PATCH(request: Request) {
  const ctx = await requireCreds();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.url || !body.calendarUrl) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }
  try {
    await toggleReminder(
      ctx.creds,
      { url: body.url, calendarUrl: body.calendarUrl },
      !!body.done
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireCreds();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const reminder = validReminder(body.reminder);
  if (!body.calendarUrl || !reminder) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  try {
    await createReminder(ctx.creds, body.calendarUrl, reminder);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const ctx = await requireCreds();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const reminder = validReminder(body.reminder);
  if (!body.url || !body.calendarUrl || !reminder) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  try {
    await updateReminder(
      ctx.creds,
      { url: body.url, calendarUrl: body.calendarUrl },
      reminder
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const ctx = await requireCreds();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.url || !body.calendarUrl) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }
  try {
    await deleteObject(ctx.creds, {
      url: body.url,
      calendarUrl: body.calendarUrl,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

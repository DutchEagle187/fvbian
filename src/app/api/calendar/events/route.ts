import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  createEvent,
  deleteObject,
  fetchEvents,
  fetchUpcomingEvents,
  getCreds,
  updateEvent,
  type EventInput,
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

function validEvent(e: unknown): EventInput | null {
  const v = e as Partial<EventInput> | undefined;
  if (!v || typeof v.title !== "string" || !v.title.trim()) return null;
  if (typeof v.start !== "string" || !v.start) return null;
  return {
    title: v.title,
    allDay: !!v.allDay,
    start: v.start,
    end: typeof v.end === "string" ? v.end : v.start,
    location: typeof v.location === "string" ? v.location : undefined,
    notes: typeof v.notes === "string" ? v.notes : undefined,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creds = await getCreds(session.user.email);
  if (!creds) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const params = new URL(request.url).searchParams;
  const startParam = params.get("start");
  const endParam = params.get("end");

  try {
    let events;
    if (startParam && endParam) {
      const start = new Date(startParam);
      const end = new Date(endParam);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: "invalid range" }, { status: 400 });
      }
      events = await fetchEvents(creds, start, end);
    } else {
      const daysParam = Number(params.get("days"));
      const days = Number.isFinite(daysParam)
        ? Math.min(Math.max(daysParam, 1), 60)
        : 14;
      events = await fetchUpcomingEvents(creds, days);
    }
    return NextResponse.json({ connected: true, events });
  } catch (e) {
    return NextResponse.json(
      {
        connected: true,
        events: [],
        error: (e as Error).message || "Termine konnten nicht geladen werden.",
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await requireCreds();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const event = validEvent(body.event);
  if (!body.calendarUrl || !event) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  try {
    await createEvent(ctx.creds, body.calendarUrl, event);
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
  const event = validEvent(body.event);
  if (!body.url || !body.calendarUrl || !event) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  try {
    await updateEvent(
      ctx.creds,
      { url: body.url, calendarUrl: body.calendarUrl },
      event
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

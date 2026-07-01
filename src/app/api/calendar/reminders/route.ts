import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchReminders, getCreds, toggleReminder } from "@/lib/caldav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creds = await getCreds(session.user.email);
  if (!creds) {
    return NextResponse.json({ connected: false, reminders: [] });
  }

  try {
    const reminders = await fetchReminders(creds);
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creds = await getCreds(session.user.email);
  if (!creds) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  let body: { url?: string; calendarUrl?: string; done?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.url || !body.calendarUrl) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }

  try {
    await toggleReminder(
      creds,
      { url: body.url, calendarUrl: body.calendarUrl },
      !!body.done
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Aktualisierung fehlgeschlagen." },
      { status: 502 }
    );
  }
}

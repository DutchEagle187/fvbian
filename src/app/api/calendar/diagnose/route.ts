import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  fetchReminders,
  fetchUpcomingEvents,
  getCreds,
  listCollections,
} from "@/lib/caldav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only diagnostics for the iCloud connection. Open this URL while logged
 * in to see exactly what CalDAV returns. Never exposes the password.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creds = await getCreds(session.user.email);
  if (!creds) {
    return NextResponse.json({
      connected: false,
      hint: "Keine gespeicherten Zugangsdaten. Bitte im Kalender-Tool verbinden.",
    });
  }

  const report: Record<string, unknown> = {
    connected: true,
    username: creds.username.replace(/(.{2}).*(@.*)/, "$1***$2"),
  };

  try {
    const collections = await listCollections(creds);
    report.collections = collections.map((c) => ({
      name: c.name,
      kind: c.kind,
      host: safeHost(c.url),
    }));
  } catch (e) {
    report.collectionsError = errInfo(e);
  }

  try {
    const events = await fetchUpcomingEvents(creds, 30);
    report.events = {
      count: events.length,
      sample: events.slice(0, 3).map((ev) => ({
        title: ev.title,
        start: ev.start,
        calendar: ev.calendar,
      })),
    };
  } catch (e) {
    report.eventsError = errInfo(e);
  }

  try {
    const reminders = await fetchReminders(creds);
    report.reminders = {
      count: reminders.length,
      sample: reminders.slice(0, 3).map((r) => ({
        title: r.title,
        list: r.list,
        completed: r.completed,
      })),
    };
  } catch (e) {
    report.remindersError = errInfo(e);
  }

  return NextResponse.json(report);
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "?";
  }
}

function errInfo(e: unknown): { message: string; name?: string } {
  const err = e as Error & { statusCode?: number };
  return {
    message: err?.message || String(e),
    name: err?.name,
  };
}

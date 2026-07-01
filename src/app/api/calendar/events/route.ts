import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchUpcomingEvents, getCreds } from "@/lib/caldav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creds = await getCreds(session.user.email);
  if (!creds) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const daysParam = Number(new URL(request.url).searchParams.get("days"));
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(daysParam, 1), 60)
    : 14;

  try {
    const events = await fetchUpcomingEvents(creds, days);
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

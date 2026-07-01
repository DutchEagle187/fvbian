import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getRedis } from "@/lib/redis";
import {
  deleteCreds,
  getCreds,
  saveCreds,
  testConnection,
} from "@/lib/caldav";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const configured = !!getRedis();
  const creds = await getCreds(session.user.email);
  return NextResponse.json({ configured, connected: !!creds });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!getRedis()) {
    return NextResponse.json(
      { error: "Cloud-Speicher (Redis) ist nicht konfiguriert." },
      { status: 400 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const username = body.username?.trim();
  const password = body.password?.trim();
  if (!username || !password) {
    return NextResponse.json(
      { error: "Apple-ID und app-spezifisches Passwort sind erforderlich." },
      { status: 400 }
    );
  }

  const result = await testConnection({ username, password });
  if (!result.ok) {
    return NextResponse.json(
      {
        error: `Verbindung fehlgeschlagen: ${
          result.error ?? "unbekannter Fehler"
        }`,
      },
      { status: 400 }
    );
  }

  await saveCreds(session.user.email, { username, password });
  return NextResponse.json({ ok: true, calendars: result.calendars });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteCreds(session.user.email);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

// Which per-user documents may be stored/read through this endpoint.
const ALLOWED_KEYS = new Set([
  "bookmarks",
  "todos",
  "notes",
  "watchlist",
  "notebook",
]);

function storageKey(email: string, key: string) {
  return `u:${email.toLowerCase()}:${key}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "unknown key" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ configured: false, data: null });
  }

  const data = await redis.get(storageKey(session.user.email, key));
  return NextResponse.json({ configured: true, data: data ?? null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "unknown key" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ configured: false });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const data = (body as { data?: unknown })?.data ?? null;
  await redis.set(storageKey(session.user.email, key), data);
  return NextResponse.json({ configured: true, ok: true });
}

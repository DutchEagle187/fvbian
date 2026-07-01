import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCreds, listCollections } from "@/lib/caldav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const creds = await getCreds(session.user.email);
  if (!creds) {
    return NextResponse.json({ connected: false, collections: [] });
  }
  try {
    const collections = await listCollections(creds);
    return NextResponse.json({ connected: true, collections });
  } catch (e) {
    return NextResponse.json(
      { connected: true, collections: [], error: (e as Error).message },
      { status: 502 }
    );
  }
}

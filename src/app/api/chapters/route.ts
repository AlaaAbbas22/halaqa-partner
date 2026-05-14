import { NextResponse } from "next/server";

import { getQuranServerClient } from "@/lib/quran-server";

export async function GET() {
  try {
    const client = getQuranServerClient();
    const chapters = await client.content.v4.chapters.list();
    return NextResponse.json(chapters);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

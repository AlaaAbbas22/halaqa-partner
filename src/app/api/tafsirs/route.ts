import { NextResponse } from "next/server";

import { getQuranServerClient } from "@/lib/quran-server";

/** Public metadata for choosing tafsir resources (Quran Foundation API). */
export async function GET() {
  try {
    const client = getQuranServerClient();
    const list = await client.content.v4.resources.tafsirs.list();
    const tafsirs = (list ?? [])
      .filter((t) => t.id != null)
      .map((t) => ({
        id: t.id as number,
        name: t.name ?? "",
        authorName: t.authorName ?? "",
        slug: t.slug ?? "",
        languageName: t.languageName ?? "",
      }))
      .sort((a, b) => {
        const la = a.languageName.toLowerCase();
        const lb = b.languageName.toLowerCase();
        if (la === "english" && lb !== "english") return -1;
        if (lb === "english" && la !== "english") return 1;
        return a.name.localeCompare(b.name);
      });
    return NextResponse.json({ tafsirs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

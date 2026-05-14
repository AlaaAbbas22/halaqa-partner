import type { ChapterId } from "@quranjs/api";
import { NextResponse } from "next/server";

import { cleanTranslationHtml } from "@/lib/clean-translation";
import { getQuranServerClient } from "@/lib/quran-server";

type RouteContext = { params: Promise<{ chapterId: string }> };

/** English translation resource id 20 (Sahih International) — common on Quran.com API. */
const DEFAULT_TRANSLATION_IDS = [20];

export async function GET(request: Request, context: RouteContext) {
  try {
    const { chapterId: rawChapterId } = await context.params;
    const num = Number(rawChapterId);
    if (!Number.isInteger(num) || num < 1 || num > 114) {
      return NextResponse.json({ error: "Invalid chapter id" }, { status: 400 });
    }
    const chapterId = String(num) as ChapterId;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("perPage") ?? 25) || 25),
    );

    const client = getQuranServerClient();
    const verses = await client.content.v4.verses.byChapter(chapterId, {
      translations: DEFAULT_TRANSLATION_IDS,
      page,
      perPage,
      fields: {
        textUthmani: true,
        textUthmaniSimple: true,
        textImlaei: true,
        textImlaeiSimple: true,
      },
    });

    const versesOut = verses.map((v) => ({
      ...v,
      translations: v.translations?.map((t) => ({
        ...t,
        text: cleanTranslationHtml(t.text),
      })),
    }));

    return NextResponse.json({ verses: versesOut, page, perPage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

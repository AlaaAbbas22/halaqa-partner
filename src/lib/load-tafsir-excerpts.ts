import type { VerseKey } from "@quranjs/api";

import { cleanTranslationHtml } from "@/lib/clean-translation";
import type { QuranServerClient } from "@/lib/quran-server";

function assertVerseKey(key: string): VerseKey | null {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(key.trim());
  if (!m) return null;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > 286) return null;
  return key.trim() as VerseKey;
}

async function runBatched<K extends string, T>(
  items: readonly K[],
  batchSize: number,
  fn: (item: K) => Promise<T>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/**
 * Fetches tafsir text for each verse from Quran Foundation content API
 * (`content.v4.verses.byKey` with `tafsirs: [...]`).
 */
export async function loadTafsirExcerptsForPrompt(
  client: QuranServerClient,
  verseKeys: string[],
  tafsirResourceIds: number[],
  maxCharsPerPassage = 5500,
): Promise<string> {
  const uniqueKeys = [...new Set(verseKeys.map((k) => k.trim()))];
  const keys = uniqueKeys.map(assertVerseKey).filter((k): k is VerseKey => k != null);
  const ids = [...new Set(tafsirResourceIds)].filter(
    (n) => Number.isInteger(n) && n > 0,
  );
  if (keys.length === 0 || ids.length === 0) {
    return "";
  }

  const blocks = await runBatched(keys, 3, async (key) => {
    try {
      const verse = await client.content.v4.verses.byKey(key, {
        tafsirs: ids,
        fields: { textUthmani: true },
      });
      const parts: string[] = [];
      for (const t of verse.tafsirs ?? []) {
        const body = cleanTranslationHtml(t.text).slice(0, maxCharsPerPassage);
        if (!body) continue;
        const title =
          t.resourceName?.trim() ||
          t.slug?.trim() ||
          (t.resourceId != null ? `Tafsir #${t.resourceId}` : "Tafsir");
        const lang = t.languageName ? ` — ${t.languageName}` : "";
        parts.push(`**${key}** — ${title}${lang}\n${body}`);
      }
      return parts.join("\n\n");
    } catch {
      return "";
    }
  });

  return blocks.filter(Boolean).join("\n\n---\n\n").trim();
}

export function parseTafsirResourceIdsEnv(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

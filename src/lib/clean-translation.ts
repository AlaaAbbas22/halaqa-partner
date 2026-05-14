/**
 * Quran.com translation strings often include `<sup foot_note=...>n</sup>`.
 * Strip markup for readable UI and cleaner LLM context.
 */
export function cleanTranslationHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

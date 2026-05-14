import { Language } from "@quranjs/api";
import { createServerClient } from "@quranjs/api/server";

let cached: ReturnType<typeof createServerClient> | null = null;

export type QuranServerClient = ReturnType<typeof createServerClient>;

export function getQuranServerClient(): QuranServerClient {
  const clientId = process.env.QURAN_CLIENT_ID;
  const clientSecret = process.env.QURAN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Set QURAN_CLIENT_ID and QURAN_CLIENT_SECRET (Quran.com API credentials).",
    );
  }
  if (!cached) {
    const oauth2BaseUrl = process.env.QURAN_OAUTH2_BASE_URL?.trim();
    if (!oauth2BaseUrl) {
      throw new Error(
        "Set QURAN_OAUTH2_BASE_URL to the OAuth token host from your Quran API project (see api.quran.com dashboard).",
      );
    }
    cached = createServerClient({
      clientId,
      clientSecret,
      defaults: { language: Language.ENGLISH },
      services: { oauth2BaseUrl },
    });
  }
  return cached;
}

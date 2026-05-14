import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { cleanTranslationHtml } from "@/lib/clean-translation";
import {
  loadTafsirExcerptsForPrompt,
  parseTafsirResourceIdsEnv,
} from "@/lib/load-tafsir-excerpts";
import { getQuranServerClient } from "@/lib/quran-server";
import {
  formatAyahsForPrompt,
  HALAQA_PEDAGOGY,
  localeInstruction,
} from "@/lib/tafseer-system-prompt";

type Role = "user" | "assistant";

type AyahContext = {
  verseKey: string;
  arabic: string;
  translation: string;
};

type IncomingMessage = { role: Role; content: string };

const MAX_AYAHS = 12;
const MAX_MESSAGES = 40;

function toGeminiRole(role: Role): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY. Add it from Google AI Studio." },
      { status: 500 },
    );
  }

  let body: {
    messages?: IncomingMessage[];
    ayahContext?: AyahContext[];
    bootstrap?: boolean;
    locale?: string;
    tafsirResourceIds?: unknown[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ayahContext = Array.isArray(body.ayahContext) ? body.ayahContext : [];
  if (ayahContext.length > MAX_AYAHS) {
    return NextResponse.json(
      { error: `Select at most ${MAX_AYAHS} ayahs for one session.` },
      { status: 400 },
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: "Conversation is too long for one request." },
      { status: 400 },
    );
  }

  if (ayahContext.length === 0) {
    return NextResponse.json(
      { error: "Add at least one ayah to the session context first." },
      { status: 400 },
    );
  }

  const locale = body.locale === "ar" ? "ar" : body.locale === "en" ? "en" : null;
  if (!locale) {
    return NextResponse.json(
      { error: "Choose conversation language: send locale \"en\" or \"ar\"." },
      { status: 400 },
    );
  }

  const trimmedAyahs = ayahContext.map((a) => ({
    verseKey: String(a.verseKey).slice(0, 16),
    arabic: String(a.arabic).slice(0, 4000),
    translation: cleanTranslationHtml(String(a.translation)).slice(0, 8000),
  }));

  const requestedTafsirIds = Array.isArray(body.tafsirResourceIds)
    ? body.tafsirResourceIds
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 3)
    : [];
  const envTafsirIds = parseTafsirResourceIdsEnv(process.env.TAFSIR_RESOURCE_IDS);
  const tafsirResourceIds =
    requestedTafsirIds.length > 0
      ? requestedTafsirIds
      : envTafsirIds.length > 0
        ? envTafsirIds.slice(0, 3)
        : [171];

  let tafsirExcerptBlock = "";
  try {
    const quran = getQuranServerClient();
    tafsirExcerptBlock = await loadTafsirExcerptsForPrompt(
      quran,
      trimmedAyahs.map((a) => a.verseKey),
      tafsirResourceIds,
    );
  } catch {
    tafsirExcerptBlock = "";
  }

  const tafsirSection = tafsirExcerptBlock
    ? `
---
### Tafsir excerpts (Quran.com / Quran Foundation API)
Resource IDs used: ${tafsirResourceIds.join(", ")}

${tafsirExcerptBlock}
---
`
    : `
---
### Tafsir excerpts (Quran.com / Quran Foundation API)
No body text was returned for resource IDs ${tafsirResourceIds.join(", ")} (the API may omit some ayah/resource pairs, or IDs may be invalid). Acknowledge gaps briefly if the learner asks; do not invent long quotations.
---
`;

  const systemInstruction = `${HALAQA_PEDAGOGY}

${localeInstruction(locale)}

---
Ayahs in focus for this session (the learner selected these):
${formatAyahsForPrompt(trimmedAyahs)}
${tafsirSection}`;

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });

  const bootstrap = Boolean(body.bootstrap);

  try {
    if (bootstrap) {
      const prompt =
        locale === "ar"
          ? `انضم المتعلم للحلقة واختار الآيات المذكورة في تعليماتك، ولم يتكلم بعد. ابدأ بتحية قصيرة ودافئة ثم اسأل أسئلة تأملية أولية: ما الذي يشعر به وهو يجلس مع هذه الآيات، وكيف يفهم معناها بكلماته؟ اجعل الإجابة موجزة—جملتان أو ثلاث ثم أسئلة واضحة.`
          : `The learner has just joined the halaqa and selected the ayahs in your instructions. They have not spoken yet. Open with a brief, warm greeting and your first reflective questions: what do they feel when they sit with these ayahs, and what do they think they mean? Keep it short—two or three sentences plus clear questions.`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = result.response.text();
      return NextResponse.json({ reply: text });
    }

    const contents = messages.map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: String(m.content).slice(0, 12000) }],
    }));

    if (contents.length === 0) {
      return NextResponse.json(
        { error: "No messages to send, or use bootstrap to open the halaqa." },
        { status: 400 },
      );
    }

    const last = contents[contents.length - 1];
    if (last.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from the user." },
        { status: 400 },
      );
    }

    const result = await model.generateContent({ contents });
    const text = result.response.text();
    return NextResponse.json({ reply: text });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gemini request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

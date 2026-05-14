"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cleanTranslationHtml } from "@/lib/clean-translation";

type Chapter = {
  id: number;
  nameSimple: string;
  nameArabic: string;
  versesCount: number;
};

type Verse = {
  verseKey: string;
  verseNumber: number;
  textUthmani?: string;
  textUthmaniSimple?: string;
  textImlaei?: string;
  textImlaeiSimple?: string;
  translations?: { text: string }[];
};

type TafsirOption = {
  id: number;
  name: string;
  authorName: string;
  slug: string;
  languageName: string;
};

export type AyahSelection = {
  verseKey: string;
  arabic: string;
  translation: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type ConversationLang = "en" | "ar";

export function ChatPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string>("1");
  const [versePage, setVersePage] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [versesLoading, setVersesLoading] = useState(false);
  const [versesError, setVersesError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [sessionAyahs, setSessionAyahs] = useState<AyahSelection[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [conversationLang, setConversationLang] =
    useState<ConversationLang | null>(null);
  const [tafsirsList, setTafsirsList] = useState<TafsirOption[]>([]);
  const [tafsirsError, setTafsirsError] = useState<string | null>(null);
  const [selectedTafsirIds, setSelectedTafsirIds] = useState<number[]>([171]);

  const perPage = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chapters");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load chapters");
        if (!cancelled) {
          setChapters(data);
          setChaptersError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setChaptersError(e instanceof Error ? e.message : "Chapters error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tafsirs");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load tafsirs");
        if (!cancelled) {
          setTafsirsList(data.tafsirs ?? []);
          setTafsirsError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setTafsirsError(e instanceof Error ? e.message : "Tafsirs error");
          setTafsirsList([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tafsirsList.length === 0) return;
    setSelectedTafsirIds((prev) => {
      const valid = prev.filter((id) => tafsirsList.some((t) => t.id === id));
      if (valid.length > 0) return valid.slice(0, 3);
      const kathir = tafsirsList.find((t) => t.id === 171);
      const en = tafsirsList.find(
        (t) => t.languageName.toLowerCase() === "english",
      );
      return [(kathir ?? en ?? tafsirsList[0]).id];
    });
  }, [tafsirsList]);

  const loadVerses = useCallback(async () => {
    setVersesLoading(true);
    setVersesError(null);
    try {
      const res = await fetch(
        `/api/verses/chapter/${chapterId}?page=${versePage}&perPage=${perPage}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load verses");
      setVerses(data.verses ?? []);
    } catch (e) {
      setVersesError(e instanceof Error ? e.message : "Verses error");
      setVerses([]);
    } finally {
      setVersesLoading(false);
    }
  }, [chapterId, versePage, perPage]);

  useEffect(() => {
    void loadVerses();
  }, [loadVerses]);

  const chapterLabel = useMemo(() => {
    const c = chapters.find((x) => String(x.id) === chapterId);
    if (!c) return `Surah ${chapterId}`;
    return `${c.id}. ${c.nameSimple} — ${c.nameArabic}`;
  }, [chapters, chapterId]);

  const toggleVerseKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addSelectionToSession = () => {
    const additions: AyahSelection[] = [];
    for (const v of verses) {
      if (!selectedKeys.has(v.verseKey)) continue;
      if (sessionAyahs.some((s) => s.verseKey === v.verseKey)) continue;
      const arabic =
        v.textUthmani ??
        v.textUthmaniSimple ??
        v.textImlaei ??
        v.textImlaeiSimple ??
        "";
      const translation = cleanTranslationHtml(v.translations?.[0]?.text);
      additions.push({ verseKey: v.verseKey, arabic, translation });
    }
    if (sessionAyahs.length + additions.length > 12) {
      setChatError("You can have at most 12 ayahs in one session.");
      return;
    }
    setChatError(null);
    setSessionAyahs((prev) => [...prev, ...additions]);
    setSelectedKeys(new Set());
  };

  const toggleTafsirResource = (id: number) => {
    setSelectedTafsirIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const removeAyah = (key: string) => {
    setSessionAyahs((prev) => prev.filter((a) => a.verseKey !== key));
    if (started) {
      setStarted(false);
      setMessages([]);
    }
  };

  const beginHalaqa = async () => {
    if (sessionAyahs.length === 0) {
      setChatError("Choose at least one ayah for context.");
      return;
    }
    if (!conversationLang) {
      setChatError("Choose conversation language (English or العربية) first.");
      return;
    }
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bootstrap: true,
          messages: [],
          ayahContext: sessionAyahs,
          locale: conversationLang,
          tafsirResourceIds: selectedTafsirIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setMessages([{ role: "assistant", content: data.reply }]);
      setStarted(true);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !started || !conversationLang) return;
    const before = messages;
    const nextMessages: ChatMessage[] = [
      ...before,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bootstrap: false,
          messages: nextMessages,
          ayahContext: sessionAyahs,
          locale: conversationLang,
          tafsirResourceIds: selectedTafsirIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply },
      ]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed");
      setMessages(before);
    } finally {
      setChatLoading(false);
    }
  };

  const currentChapter = chapters.find((c) => String(c.id) === chapterId);
  const totalPages = currentChapter
    ? Math.max(1, Math.ceil(currentChapter.versesCount / perPage))
    : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/40 p-4 sm:p-5">
        <h1 className="text-lg font-semibold text-emerald-950 sm:text-xl">
          Reflection chat
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          This space follows an <strong>active learning</strong> arc: first your
          impressions and meanings, then tafsir grounded in{" "}
          <strong>text fetched from the Quran Foundation API</strong> (the books
          you tick below), then application to daily life. Gemini still runs the
          conversation, but the written tafsir passages injected into each
          request come from the same API that powers Quran.com—not from memory
          alone.
        </p>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Ayahs in context
          </h2>
          {chaptersError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {chaptersError}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-stone-600">Surah</label>
            <select
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setVersePage(1);
                setSelectedKeys(new Set());
              }}
              disabled={chapters.length === 0}
            >
              {chapters.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.id}. {c.nameSimple}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-stone-600">
            <span>{chapterLabel}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-stone-300 px-2 py-1 disabled:opacity-40"
                disabled={versePage <= 1 || versesLoading}
                onClick={() => setVersePage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span>
                Page {versePage} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded border border-stone-300 px-2 py-1 disabled:opacity-40"
                disabled={versePage >= totalPages || versesLoading}
                onClick={() =>
                  setVersePage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </button>
            </div>
          </div>

          {versesError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {versesError}
            </p>
          )}

          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-stone-200">
            {versesLoading ? (
              <p className="p-4 text-sm text-stone-500">Loading verses…</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {verses.map((v) => (
                  <li
                    key={v.verseKey}
                    className="flex gap-3 p-3 text-sm hover:bg-stone-50/80"
                  >
                    <input
                      type="checkbox"
                      className="mt-1.5 shrink-0"
                      checked={selectedKeys.has(v.verseKey)}
                      onChange={() => toggleVerseKey(v.verseKey)}
                      aria-label={`Select verse ${v.verseKey}`}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="font-mono text-xs font-medium text-emerald-900">
                        {v.verseKey}
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                          Arabic
                        </p>
                        <p
                          className="mt-0.5 text-right text-[15px] leading-relaxed text-stone-900"
                          dir="rtl"
                        >
                          {v.textUthmani ??
                            v.textUthmaniSimple ??
                            v.textImlaei ??
                            v.textImlaeiSimple ??
                            "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                          English
                        </p>
                        <p
                          className="mt-0.5 text-left text-[13px] leading-relaxed text-stone-700"
                          dir="ltr"
                        >
                          {cleanTranslationHtml(v.translations?.[0]?.text) ||
                            "—"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg bg-emerald-800 py-2 text-sm font-medium text-white transition hover:bg-emerald-900 disabled:opacity-50"
            disabled={selectedKeys.size === 0}
            onClick={addSelectionToSession}
          >
            Add selected to session ({selectedKeys.size})
          </button>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Session ({sessionAyahs.length}/12)
            </h3>
            {sessionAyahs.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                No ayahs yet. Select verses above, then add them here.
              </p>
            ) : (
              <ul className="mt-2 max-h-[220px] space-y-3 overflow-y-auto pr-1">
                {sessionAyahs.map((a) => (
                  <li
                    key={a.verseKey}
                    className="rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium text-emerald-900">
                        {a.verseKey}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-[11px] text-red-700 hover:underline"
                        onClick={() => removeAyah(a.verseKey)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                          Arabic
                        </p>
                        <p
                          className="mt-0.5 text-right text-sm leading-relaxed text-stone-900"
                          dir="rtl"
                        >
                          {a.arabic}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                          English
                        </p>
                        <p
                          className="mt-0.5 text-left text-[12px] leading-relaxed text-stone-700"
                          dir="ltr"
                        >
                          {a.translation || "—"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Tafsir sources (API)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Pick up to three resources. Excerpts for your selected ayahs are
              loaded from{" "}
              <code className="rounded bg-stone-100 px-1">verses.byKey</code>{" "}
              on each message (Quran Foundation).
            </p>
            {tafsirsError && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
                Could not list tafsirs ({tafsirsError}). Using ID{" "}
                <strong>171</strong> if still valid.
              </p>
            )}
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/50 p-2">
              {tafsirsList.length === 0 && !tafsirsError ? (
                <p className="p-2 text-xs text-stone-500">Loading tafsir list…</p>
              ) : tafsirsList.length === 0 ? null : (
                <ul className="space-y-1.5">
                  {tafsirsList.map((t) => (
                    <li key={t.id} className="flex gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={selectedTafsirIds.includes(t.id)}
                        onChange={() => toggleTafsirResource(t.id)}
                        aria-label={t.name}
                      />
                      <label className="min-w-0 leading-snug text-stone-800">
                        <span className="font-mono text-[10px] text-emerald-800">
                          {t.id}
                        </span>{" "}
                        {t.name}
                        {t.authorName ? (
                          <span className="text-stone-500">
                            {" "}
                            — {t.authorName}
                          </span>
                        ) : null}
                        {t.languageName ? (
                          <span className="text-stone-400">
                            {" "}
                            ({t.languageName})
                          </span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 text-[10px] text-stone-500">
              Selected IDs: {selectedTafsirIds.join(", ") || "—"} (max 3)
            </p>
          </div>

          {!started ? (
            <>
              {!conversationLang && sessionAyahs.length > 0 && (
                <p className="text-xs text-amber-800">
                  In the chat panel, choose <strong>English</strong> or{" "}
                  <strong>العربية</strong> for the conversation, then press Begin
                  reflection.
                </p>
              )}
              <button
                type="button"
                className="rounded-lg border border-emerald-900/30 bg-emerald-900 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-950 disabled:opacity-50"
                disabled={
                  sessionAyahs.length === 0 ||
                  chatLoading ||
                  !conversationLang ||
                  selectedTafsirIds.length === 0
                }
                onClick={() => void beginHalaqa()}
              >
                {chatLoading ? "Starting…" : "Begin reflection"}
              </button>
            </>
          ) : (
            <p className="text-xs text-stone-600">
              To change ayahs, remove them from the session list (this resets the
              chat).
            </p>
          )}
        </section>

        <section className="flex min-h-[480px] flex-col rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-stone-900">Conversation</h2>
          </div>

          {!started && (
            <div className="border-b border-emerald-900/10 bg-emerald-50/50 px-4 py-4 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Step 1 — Language
              </p>
              <p className="mt-1 text-sm text-stone-700">
                Should this halaqa be in{" "}
                <span className="font-medium">English</span> or{" "}
                <span className="font-medium" dir="rtl">
                  العربية
                </span>
                ? Choose before you begin.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    conversationLang === "en"
                      ? "border-emerald-800 bg-emerald-800 text-white"
                      : "border-stone-300 bg-white text-stone-800 hover:border-emerald-700"
                  }`}
                  onClick={() => {
                    setConversationLang("en");
                    setChatError(null);
                  }}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    conversationLang === "ar"
                      ? "border-emerald-800 bg-emerald-800 text-white"
                      : "border-stone-300 bg-white text-stone-800 hover:border-emerald-700"
                  }`}
                  onClick={() => {
                    setConversationLang("ar");
                    setChatError(null);
                  }}
                >
                  <span dir="rtl">العربية</span>
                </button>
              </div>
              {conversationLang && (
                <p className="mt-2 text-xs text-emerald-900">
                  Selected:{" "}
                  <strong>
                    {conversationLang === "en" ? "English" : "العربية"}
                  </strong>
                  . Add ayahs on the left, then <strong>Begin reflection</strong>.
                </p>
              )}
            </div>
          )}

          {chatError && (
            <div className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-5">
              {chatError}
            </div>
          )}

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
            {messages.length === 0 ? (
              <p className="text-sm text-stone-500">
                {conversationLang
                  ? conversationLang === "ar"
                    ? "عندما تكون جاهزًا، اختر الآيات على اليسار ثم اضغط «Begin reflection»."
                    : "When you are ready, pick ayahs on the left and press Begin reflection."
                  : "Choose English or العربية above, then select ayahs and begin."}
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[90%] ${
                    m.role === "user"
                      ? "ml-auto bg-emerald-900 text-white"
                      : "mr-auto border border-stone-200 bg-stone-50 text-stone-900"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {m.role === "user"
                      ? conversationLang === "ar"
                        ? "أنت"
                        : "You"
                      : conversationLang === "ar"
                        ? "المرشد"
                        : "Guide"}
                  </div>
                  <div
                    className="whitespace-pre-wrap"
                    dir={
                      conversationLang === "ar"
                        ? "rtl"
                        : "ltr"
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-stone-100 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                className="min-h-[88px] flex-1 resize-y rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:bg-stone-50"
                dir={
                  started && conversationLang === "ar" ? "rtl" : "ltr"
                }
                placeholder={
                  !started
                    ? conversationLang === "ar"
                      ? "اختر اللغة ثم ابدأ الحلقة…"
                      : "Choose language, then begin the halaqa…"
                    : conversationLang === "ar"
                      ? "اكتب تأملاتك…"
                      : "Share your reflections…"
                }
                value={input}
                disabled={!started || chatLoading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
                disabled={!started || chatLoading || !input.trim()}
                onClick={() => void sendMessage()}
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

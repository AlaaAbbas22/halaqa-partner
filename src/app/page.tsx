import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(6, 78, 59, 0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(180, 83, 9, 0.08), transparent 40%)",
        }}
      />
      <div className="relative mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-800">
          Tafseer Halaqa App
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">
          Sit with the ayahs. Think. Then understand.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-stone-700">
          Choose a few verses, bring them into your session, and chat with a
          Gemini-powered guide that prioritizes{" "}
          <strong>your reflection first</strong>, then classical and
          contemporary tafseer perspectives, and finally how these words might
          touch your daily life.
        </p>
        <ul className="mt-8 space-y-3 text-stone-700">
          <li className="flex gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
            Ayah text and English translation are loaded with{" "}
            <code className="rounded bg-stone-200/80 px-1.5 py-0.5 text-sm">
              @quranjs/api
            </code>.
          </li>
          <li className="flex gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
            The assistant is prompted for active learning—not a one-way
            lecture.
          </li>
        </ul>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-950"
          >
            Open reflection chat
          </Link>
          <a
            href="https://api.quran.com/"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-800 transition hover:border-emerald-800/40 hover:bg-emerald-50/50"
            target="_blank"
            rel="noopener noreferrer"
          >
            Quran API
          </a>
        </div>
      </div>
    </div>
  );
}

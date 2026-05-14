import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-emerald-900/15 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-emerald-950 sm:text-base"
        >
          Tafseer Halaqa
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-stone-600 transition hover:text-emerald-900"
          >
            Home
          </Link>
          <Link
            href="/chat"
            className="rounded-full bg-emerald-800 px-3 py-1.5 font-medium text-white shadow-sm transition hover:bg-emerald-900"
          >
            Chat
          </Link>
        </nav>
      </div>
    </header>
  );
}

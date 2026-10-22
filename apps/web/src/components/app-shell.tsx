import { labels } from "@team-republic/client";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useLocale } from "../lib/locale.tsx";

export function AppShell({ children }: { children: ReactNode }) {
  const { locale, toggleLocale } = useLocale();
  const L = labels[locale];

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-neutral-900 hover:text-neutral-700">
            {L.appName}
          </Link>
          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            lang={locale === "en" ? "ta" : "en"}
          >
            {L.language}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

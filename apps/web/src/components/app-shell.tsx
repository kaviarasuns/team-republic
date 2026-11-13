import { labels } from "@team-republic/client";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useLocale } from "../lib/locale.tsx";

const navLink =
  "rounded-md px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900";
const navLinkActive = "rounded-md bg-neutral-100 px-2 py-1 text-sm font-medium text-neutral-900";

/**
 * Page frame. `fullWidth` gives the page the whole viewport below the header
 * (the map); other pages sit in a centred reading column.
 */
export function AppShell({
  children,
  fullWidth = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const { locale, toggleLocale } = useLocale();
  const L = labels[locale];
  const width = fullWidth ? "px-4" : "mx-auto max-w-3xl px-4";

  return (
    <div className={fullWidth ? "flex h-dvh flex-col" : "flex min-h-dvh flex-col"}>
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className={`${width} flex items-center justify-between gap-4 py-3`}>
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="truncate text-lg font-semibold text-neutral-900 hover:text-neutral-700"
            >
              {L.appName}
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className={navLink}
                activeProps={{ className: navLinkActive }}
              >
                {L.constituencies}
              </Link>
              <Link to="/map" className={navLink} activeProps={{ className: navLinkActive }}>
                {L.map}
              </Link>
            </nav>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            lang={locale === "en" ? "ta" : "en"}
          >
            {L.language}
          </button>
        </div>
      </header>
      {fullWidth ? (
        <main className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">{children}</main>
      ) : (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      )}
    </div>
  );
}

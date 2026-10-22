import { useAtomValue } from "@effect/atom-react";
import { constituenciesAtom, formatNumber, labels, localizedName } from "@team-republic/client";
import type { ConstituencySummary } from "@team-republic/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AsyncResultView } from "../lib/async-result-view.tsx";
import { useLocale } from "../lib/locale.tsx";
import { displayName } from "../lib/names.ts";

export const Route = createFileRoute("/")({
  component: ConstituenciesPage,
});

function reservationLabel(
  constituency: ConstituencySummary,
  locale: keyof typeof labels,
): string | null {
  const reservation = constituency.reservation;
  if (!reservation) {
    return null;
  }
  return labels[locale].reserved[reservation];
}

function ConstituenciesPage() {
  const { locale } = useLocale();
  const L = labels[locale];
  const listAtom = useMemo(() => constituenciesAtom(), []);
  const result = useAtomValue(listAtom);
  const [filter, setFilter] = useState("");

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">{L.constituencies}</h1>
      <AsyncResultView
        result={result}
        locale={locale}
        onSuccess={(data) => (
          <>
            <p className="mb-4 text-sm text-neutral-600">
              {displayName(data.election.name, locale)} ({data.election.year})
            </p>
            <label className="mb-4 block">
              <span className="sr-only">{L.constituencies}</span>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={L.search}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base shadow-sm"
                autoComplete="off"
              />
            </label>
            <ConstituencyList
              constituencies={data.constituencies}
              filter={filter.trim().toLowerCase()}
              locale={locale}
            />
          </>
        )}
      />
    </div>
  );
}

function ConstituencyList({
  constituencies,
  filter,
  locale,
}: {
  constituencies: ReadonlyArray<ConstituencySummary>;
  filter: string;
  locale: keyof typeof labels;
}) {
  const filtered = useMemo(() => {
    if (!filter) {
      return constituencies;
    }
    return constituencies.filter((c) => {
      const num = String(c.number);
      const en = c.name.en?.toLowerCase() ?? "";
      const ta = c.name.ta ?? "";
      const display = localizedName(c.name, locale)?.toLowerCase() ?? "";
      return (
        num.includes(filter) ||
        en.includes(filter) ||
        ta.includes(filter) ||
        display.includes(filter)
      );
    });
  }, [constituencies, filter, locale]);

  if (filtered.length === 0) {
    return (
      <p className="text-neutral-600" role="status">
        {labels[locale].noSearchResults}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
      {filtered.map((c) => {
        const reservation = reservationLabel(c, locale);
        return (
          <li key={c.id}>
            <Link
              to="/constituencies/$constituencyId"
              params={{ constituencyId: c.id }}
              className="flex items-baseline gap-3 px-4 py-3 hover:bg-neutral-50"
            >
              <span className="w-10 shrink-0 font-mono text-sm text-neutral-500">
                {formatNumber(c.number, locale)}
              </span>
              <span className="min-w-0 flex-1 font-medium text-neutral-900">
                {displayName(c.name, locale)}
              </span>
              {reservation ? (
                <span className="shrink-0 text-xs text-neutral-500">{reservation}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

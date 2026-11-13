import { useAtomValue } from "@effect/atom-react";
import {
  electionMapAtom,
  electionsAtom,
  formatNumber,
  formatPercent,
  labels,
  type Locale,
  localizedName,
} from "@team-republic/client";
import type {
  ConstituencyOutcome,
  ElectionId,
  ElectionMap as ElectionMapData,
  PartyId,
} from "@team-republic/contracts";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ElectionMap, type SeatHover } from "../components/election-map.tsx";
import { AsyncResultView } from "../lib/async-result-view.tsx";
import {
  BOUNDARIES_CREDIT,
  FIRST_MAP_YEAR,
  loadBoundaries,
  type SeatCollection,
} from "../lib/boundaries.ts";
import { useLocale } from "../lib/locale.tsx";
import {
  featuredParties,
  MARGIN_BINS,
  marginBinLabel,
  marginColor,
  NO_RESULT_COLOR,
  OTHER_COLOR,
  partyColor,
} from "../lib/map-colors.ts";
import { displayName } from "../lib/names.ts";

type Layer = "party" | "margin";

/**
 * `?election=<id>` picks the year (latest when absent), `layer` picks the
 * colouring, and `seat=<AC number>` keeps the selected constituency.
 */
export interface MapSearch {
  readonly election?: ElectionId | undefined;
  readonly layer?: Layer | undefined;
  readonly seat?: number | undefined;
}

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): MapSearch => {
    const result: { election?: ElectionId; layer?: Layer; seat?: number } = {};
    if (typeof search.election === "string" && search.election !== "") {
      result.election = search.election as ElectionId;
    }
    if (search.layer === "margin") result.layer = "margin";
    const seat = Number(search.seat);
    if (Number.isInteger(seat) && seat > 0) result.seat = seat;
    return result;
  },
  component: MapPage,
});

const ECI_CREDIT = "Election Commission of India";

function MapPage() {
  const { locale } = useLocale();
  const L = labels[locale];
  const search = Route.useSearch();
  const layer: Layer = search.layer ?? "party";
  const navigate = useNavigate({ from: Route.fullPath });
  const update = (next: Partial<MapSearch>, replace = false) =>
    void navigate({ search: (previous) => ({ ...previous, ...next }), replace });

  const mapAtom = useMemo(() => electionMapAtom(search.election), [search.election]);
  const result = useAtomValue(mapAtom);
  const data = AsyncResult.isSuccess(result) ? result.value : null;
  const onMap = data !== null && data.election.year >= FIRST_MAP_YEAR;

  const [boundaries, setBoundaries] = useState<SeatCollection | null>(null);
  const [boundaryError, setBoundaryError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    loadBoundaries(controller.signal)
      .then(setBoundaries)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setBoundaryError(true);
        }
      });
    return () => controller.abort();
  }, []);

  const featured = useMemo(
    () => featuredParties(data?.partySeatTotals ?? []),
    [data?.partySeatTotals],
  );
  const byAc = useMemo(
    () => new Map((data?.constituencies ?? []).map((item) => [item.constituency.number, item])),
    [data],
  );
  const fills = useMemo(() => {
    const colors = new Map<number, string>();
    if (!onMap) return colors;
    for (const [ac, outcome] of byAc) {
      colors.set(ac, layer === "party" ? partyColor(outcome, featured) : marginColor(outcome));
    }
    return colors;
  }, [byAc, featured, layer, onMap]);

  const [hover, setHover] = useState<SeatHover | null>(null);
  const [focus, setFocus] = useState<{ ac: number; key: number } | null>(null);
  const selected = search.seat !== undefined && byAc.has(search.seat) ? search.seat : null;
  const selectedOutcome = selected === null ? null : (byAc.get(selected) ?? null);
  const selectSeat = (ac: number | null, zoom = false) => {
    update({ seat: ac ?? undefined }, true);
    if (zoom && ac !== null) setFocus((previous) => ({ ac, key: (previous?.key ?? 0) + 1 }));
  };

  const hovered = hover === null ? null : (byAc.get(hover.ac) ?? null);

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:flex-row">
      <section className="relative h-[58dvh] shrink-0 bg-[#fcfcfb] lg:order-2 lg:h-full lg:flex-1">
        {boundaryError ? (
          <p className="p-6 text-red-900" role="alert">
            {L.loadFailed}
          </p>
        ) : boundaries === null ? (
          <p className="p-6 text-center text-neutral-600" role="status">
            {L.loading}
          </p>
        ) : (
          <ElectionMap
            boundaries={boundaries}
            fills={fills}
            selected={selected}
            focus={focus}
            onSelect={(ac) => selectSeat(ac)}
            onHover={setHover}
            attribution={`${L.boundaries}: ${BOUNDARIES_CREDIT} · ${L.results}: ${ECI_CREDIT}`}
            label={L.map}
          />
        )}
        {hover !== null && hovered !== null ? (
          <SeatTooltip outcome={hovered} hover={hover} locale={locale} />
        ) : null}
        {data !== null && !onMap ? (
          <p className="absolute inset-x-4 top-4 rounded-lg border border-neutral-200 bg-white/95 px-4 py-3 text-sm text-neutral-700 shadow-sm">
            {L.mapUnavailable}
          </p>
        ) : null}
        <YearBar
          selected={data?.election.id ?? null}
          onSelect={(election) => update({ election, seat: undefined })}
          locale={locale}
        />
      </section>

      <aside className="border-neutral-200 bg-white px-4 py-5 lg:order-1 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <h1 className="text-2xl font-semibold text-neutral-900">{L.map}</h1>
        <AsyncResultView
          result={result}
          locale={locale}
          onSuccess={(value) => (
            <>
              <p className="mb-4 text-sm text-neutral-600">
                {displayName(value.election.name, locale)} ({value.election.year})
              </p>
              <LayerSwitch
                layer={layer}
                onChange={(next) => update({ layer: next })}
                locale={locale}
              />
              <SeatCard outcome={selectedOutcome} locale={locale} />
              {layer === "party" ? (
                <PartyLegend data={value} featured={featured} locale={locale} />
              ) : (
                <MarginLegend data={value} locale={locale} />
              )}
              <SeatSearch
                outcomes={value.constituencies}
                onPick={(ac) => selectSeat(ac, true)}
                locale={locale}
              />
            </>
          )}
        />
      </aside>
    </div>
  );
}

function YearBar({
  selected,
  onSelect,
  locale,
}: {
  selected: ElectionId | null;
  onSelect: (electionId: ElectionId) => void;
  locale: Locale;
}) {
  const result = useAtomValue(electionsAtom);
  if (!AsyncResult.isSuccess(result)) return null;
  const years = result.value.elections
    .filter((election) => election.kind === "general" && election.year >= FIRST_MAP_YEAR)
    .sort((a, b) => a.year - b.year);
  if (years.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4">
      <div
        role="radiogroup"
        aria-label={labels[locale].electionYear}
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-neutral-200 bg-white/95 p-1 shadow-md"
      >
        {years.map((election) => {
          const isSelected = election.id === selected;
          return (
            <button
              key={election.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(election.id)}
              className={
                isSelected
                  ? "min-h-10 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white"
                  : "min-h-10 rounded-full px-4 text-sm text-neutral-800 hover:bg-neutral-100"
              }
            >
              {election.year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayerSwitch({
  layer,
  onChange,
  locale,
}: {
  layer: Layer;
  onChange: (layer: Layer) => void;
  locale: Locale;
}) {
  const L = labels[locale];
  const options: ReadonlyArray<{ value: Layer; label: string }> = [
    { value: "party", label: L.layerParty },
    { value: "margin", label: L.layerMargin },
  ];
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-sm font-medium text-neutral-700">{L.colourBy}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={
              layer === option.value
                ? "cursor-pointer rounded-md bg-white px-3 py-2 text-center text-sm font-medium text-neutral-900 shadow-sm"
                : "cursor-pointer rounded-md px-3 py-2 text-center text-sm text-neutral-700 hover:text-neutral-900"
            }
          >
            <input
              type="radio"
              name="map-layer"
              value={option.value}
              checked={layer === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3.5 shrink-0 rounded-sm"
      style={{ backgroundColor: color }}
    />
  );
}

/** Seats per party this year. It is the text version of the party colours. */
function PartyLegend({
  data,
  featured,
  locale,
}: {
  data: ElectionMapData;
  featured: ReadonlyMap<PartyId, string>;
  locale: Locale;
}) {
  const L = labels[locale];
  const rows = useMemo(() => {
    const seats = new Map<string, { label: string; color: string; seats: number }>();
    for (const outcome of data.constituencies) {
      const party = outcome.winner?.party ?? null;
      const key = outcome.winner === null ? "none" : (party?.id ?? "independent");
      const label =
        outcome.winner === null
          ? L.noResult
          : party === null
            ? L.independent
            : `${party.abbreviation} · ${displayName(party.name, locale)}`;
      const color = partyColor(outcome, featured);
      const entry = seats.get(key) ?? { label, color, seats: 0 };
      seats.set(key, { ...entry, seats: entry.seats + 1 });
    }
    return [...seats.values()].sort((a, b) => b.seats - a.seats || a.label.localeCompare(b.label));
  }, [data, featured, locale, L]);

  return (
    <section className="mb-5">
      <h2 className="mb-2 flex justify-between text-sm font-medium text-neutral-700">
        <span>{L.layerParty}</span>
        <span>{L.seatsWon}</span>
      </h2>
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <Swatch color={row.color} />
            <span className="min-w-0 flex-1 truncate text-neutral-800" title={row.label}>
              {row.label}
            </span>
            <span className="font-mono tabular-nums text-neutral-900">
              {formatNumber(row.seats, locale)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
        <Swatch color={OTHER_COLOR} />
        {L.otherParties}
      </p>
    </section>
  );
}

function MarginLegend({ data, locale }: { data: ElectionMapData; locale: Locale }) {
  const L = labels[locale];
  const counts = MARGIN_BINS.map(() => 0);
  let missing = 0;
  for (const outcome of data.constituencies) {
    const share = outcome.marginShare;
    if (share === null) {
      missing += 1;
      continue;
    }
    const index = MARGIN_BINS.findIndex((bin) => share < bin.below);
    counts[index === -1 ? MARGIN_BINS.length - 1 : index]! += 1;
  }
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex justify-between text-sm font-medium text-neutral-700">
        <span>{L.layerMargin}</span>
        <span>{L.seatsWon}</span>
      </h2>
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {MARGIN_BINS.map((bin, index) => (
          <li key={bin.color} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <Swatch color={bin.color} />
            <span className="flex-1 text-neutral-800">{marginBinLabel(index)}</span>
            <span className="font-mono tabular-nums text-neutral-900">
              {formatNumber(counts[index] ?? 0, locale)}
            </span>
          </li>
        ))}
        {missing > 0 ? (
          <li className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <Swatch color={NO_RESULT_COLOR} />
            <span className="flex-1 text-neutral-800">{L.noResult}</span>
            <span className="font-mono tabular-nums text-neutral-900">
              {formatNumber(missing, locale)}
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/**
 * The margin as a share of the vote. A real margin that rounds to 0.00% (a
 * 1-vote win) reads as "< 0.01%" so it never looks like a tie.
 */
function marginPercent(outcome: ConstituencyOutcome, locale: Locale): string {
  const share = outcome.marginShare ?? 0;
  if (share === 0 && outcome.margin !== null && outcome.margin > 0) {
    return `< ${formatPercent(0.01, locale)}`;
  }
  return formatPercent(share, locale);
}

function partyLabel(outcome: ConstituencyOutcome, locale: Locale): string {
  const L = labels[locale];
  if (outcome.winner === null) return L.noResult;
  const party = outcome.winner.party;
  return party === null
    ? L.independent
    : `${party.abbreviation} · ${displayName(party.name, locale)}`;
}

function SeatCard({ outcome, locale }: { outcome: ConstituencyOutcome | null; locale: Locale }) {
  const L = labels[locale];
  if (outcome === null) {
    return (
      <p className="mb-5 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-600">
        {L.pickSeat}
      </p>
    );
  }
  const { constituency, winner } = outcome;
  const reservation = constituency.reservation;
  return (
    <section
      aria-live="polite"
      className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"
    >
      <p className="text-xs text-neutral-500">
        {formatNumber(constituency.number, locale)}
        {reservation !== null ? ` · ${L.reserved[reservation]}` : ""}
      </p>
      <h2 className="text-lg font-semibold text-neutral-900">
        {displayName(constituency.name, locale)}
      </h2>
      {winner === null ? (
        <p className="mt-1 text-sm text-neutral-700">{L.noResult}</p>
      ) : (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-neutral-600">{L.winner}</dt>
          <dd className="font-medium text-neutral-900">{displayName(winner.name, locale)}</dd>
          <dt className="text-neutral-600">{L.party}</dt>
          <dd className="text-neutral-900">{partyLabel(outcome, locale)}</dd>
          <dt className="text-neutral-600">{L.votes}</dt>
          <dd className="tabular-nums text-neutral-900">
            {formatNumber(winner.totalVotes, locale)} ({formatPercent(winner.voteShare, locale)})
          </dd>
          {outcome.margin !== null && outcome.marginShare !== null ? (
            <>
              <dt className="text-neutral-600">{L.margin}</dt>
              <dd className="tabular-nums text-neutral-900">
                {formatNumber(outcome.margin, locale)} ({marginPercent(outcome, locale)})
              </dd>
            </>
          ) : null}
        </dl>
      )}
      <Link
        to="/constituencies/$constituencyId"
        params={{ constituencyId: constituency.id }}
        className="mt-3 inline-block text-sm font-medium text-neutral-900 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-900"
      >
        {L.fullResult} →
      </Link>
    </section>
  );
}

function SeatSearch({
  outcomes,
  onPick,
  locale,
}: {
  outcomes: ReadonlyArray<ConstituencyOutcome>;
  onPick: (ac: number) => void;
  locale: Locale;
}) {
  const L = labels[locale];
  const id = useId();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLowerCase();
  const matches =
    normalized === ""
      ? []
      : outcomes
          .filter(({ constituency }) => {
            const name = localizedName(constituency.name, locale)?.toLowerCase() ?? "";
            const en = constituency.name.en?.toLowerCase() ?? "";
            return (
              String(constituency.number) === normalized ||
              name.includes(normalized) ||
              en.includes(normalized)
            );
          })
          .slice(0, 8);

  return (
    <section className="mb-2">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-neutral-700">
        {L.search}
      </label>
      <input
        id={id}
        ref={input}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={L.search}
        autoComplete="off"
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base shadow-sm"
      />
      {normalized !== "" ? (
        matches.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600" role="status">
            {L.noSearchResults}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {matches.map(({ constituency }) => (
              <li key={constituency.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(constituency.number);
                    setQuery("");
                    input.current?.blur();
                  }}
                  className="flex w-full items-baseline gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <span className="w-8 shrink-0 font-mono text-neutral-500">
                    {formatNumber(constituency.number, locale)}
                  </span>
                  <span className="text-neutral-900">{displayName(constituency.name, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}

function SeatTooltip({
  outcome,
  hover,
  locale,
}: {
  outcome: ConstituencyOutcome;
  hover: SeatHover;
  locale: Locale;
}) {
  const L = labels[locale];
  return (
    <div
      className="pointer-events-none absolute z-10 hidden max-w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md [@media(hover:hover)]:block"
      style={{ left: hover.x, top: hover.y - 12 }}
    >
      <p className="font-medium text-neutral-900">
        {formatNumber(outcome.constituency.number, locale)} ·{" "}
        {displayName(outcome.constituency.name, locale)}
      </p>
      <p className="text-neutral-700">{partyLabel(outcome, locale)}</p>
      {outcome.marginShare !== null ? (
        <p className="tabular-nums text-neutral-600">
          {L.margin}: {marginPercent(outcome, locale)}
        </p>
      ) : null}
    </div>
  );
}

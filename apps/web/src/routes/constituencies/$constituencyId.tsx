import { useAtomValue } from "@effect/atom-react";
import { constituencyResultAtom, formatNumber, formatPercent, labels } from "@team-republic/client";
import type { ConstituencyId, ConstituencyResult, ResultRow } from "@team-republic/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AsyncResultView } from "../../lib/async-result-view.tsx";
import { useLocale } from "../../lib/locale.tsx";
import { displayName } from "../../lib/names.ts";
import { SourceLink } from "../../lib/source-link.tsx";

export const Route = createFileRoute("/constituencies/$constituencyId")({
  component: ConstituencyResultPage,
});

function ConstituencyResultPage() {
  const { constituencyId } = Route.useParams();
  const { locale } = useLocale();
  const L = labels[locale];
  const resultAtom = useMemo(
    () => constituencyResultAtom(constituencyId as ConstituencyId),
    [constituencyId],
  );
  const result = useAtomValue(resultAtom);

  return (
    <div>
      <AsyncResultView
        result={result}
        locale={locale}
        onSuccess={(data) => <ConstituencyResultView data={data} locale={locale} />}
      />
      <p className="mt-6">
        <Link to="/" className="text-sm text-neutral-600 underline hover:text-neutral-900">
          ← {L.constituencies}
        </Link>
      </p>
    </div>
  );
}

function ConstituencyResultView({
  data,
  locale,
}: {
  data: ConstituencyResult;
  locale: keyof typeof labels;
}) {
  const L = labels[locale];
  const constituencySource = data.source;

  return (
    <>
      <header className="mb-6">
        <p className="text-sm text-neutral-600">
          {displayName(data.election.name, locale)} ({formatNumber(data.election.year, locale)})
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          {formatNumber(data.constituency.number, locale)} ·{" "}
          {displayName(data.constituency.name, locale)}
        </h1>
        {data.constituency.reservation ? (
          <p className="mt-1 text-sm text-neutral-600">
            {L.reserved[data.constituency.reservation]}
          </p>
        ) : null}
      </header>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-700">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                {L.rank}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {L.candidate}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {L.party}
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-right">
                {L.votes}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {L.voteShare}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.candidates.map((row) => (
              <CandidateRow key={row.candidateId} row={row} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-white px-4 py-4 text-sm">
        {data.notaVotes != null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-neutral-700">{L.nota}</dt>
            <dd>
              <SourceLink source={constituencySource}>
                {formatNumber(data.notaVotes, locale)}
              </SourceLink>
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="font-medium text-neutral-900">{L.totalVotes}</dt>
          <dd>
            <SourceLink source={constituencySource}>
              {formatNumber(data.totalVotes, locale)}
            </SourceLink>
          </dd>
        </div>
        {data.margin != null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-neutral-700">{L.margin}</dt>
            <dd>
              <SourceLink source={constituencySource}>
                {formatNumber(data.margin, locale)}
              </SourceLink>
            </dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}

function CandidateRow({ row, locale }: { row: ResultRow; locale: keyof typeof labels }) {
  const L = labels[locale];

  return (
    <tr className="align-middle">
      <td className="px-3 py-2 font-mono text-neutral-600">{formatNumber(row.rank, locale)}</td>
      <td className="px-3 py-2">
        <Link
          to="/candidates/$candidateId"
          params={{ candidateId: row.candidateId }}
          className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-800"
        >
          {displayName(row.name, locale)}
        </Link>
        {row.isWinner ? (
          <span className="ml-2 inline-block rounded border border-neutral-400 px-1.5 py-0.5 text-xs font-medium text-neutral-800">
            {L.winner}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-neutral-800">
        {row.party ? (
          <>
            <span className="font-medium">{row.party.abbreviation}</span>
            <span className="text-neutral-600"> · {displayName(row.party.name, locale)}</span>
          </>
        ) : (
          L.independent
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        <SourceLink source={row.source}>{formatNumber(row.totalVotes, locale)}</SourceLink>
      </td>
      <td className="px-3 py-2">
        <div className="flex min-w-[8rem] items-center gap-2">
          <div
            className="h-2 flex-1 overflow-hidden rounded bg-neutral-200"
            role="presentation"
            aria-hidden
          >
            <div
              className="h-full rounded bg-neutral-500"
              style={{ width: `${Math.min(100, Math.max(0, row.voteShare))}%` }}
            />
          </div>
          <SourceLink source={row.source} className="shrink-0 tabular-nums text-neutral-800">
            {formatPercent(row.voteShare, locale)}
          </SourceLink>
        </div>
      </td>
    </tr>
  );
}

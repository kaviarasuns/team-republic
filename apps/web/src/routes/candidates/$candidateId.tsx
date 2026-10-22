import { useAtomValue } from "@effect/atom-react";
import { candidateProfileAtom, formatNumber, formatPercent, labels } from "@team-republic/client";
import type { Affidavit, Candidacy, CandidateId } from "@team-republic/contracts";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AsyncResultView } from "../../lib/async-result-view.tsx";
import { useLocale } from "../../lib/locale.tsx";
import { displayName } from "../../lib/names.ts";
import { SourceLink } from "../../lib/source-link.tsx";

export const Route = createFileRoute("/candidates/$candidateId")({
  component: CandidateProfilePage,
});

function CandidateProfilePage() {
  const { candidateId } = Route.useParams();
  const { locale } = useLocale();
  const L = labels[locale];
  const profileAtom = useMemo(
    () => candidateProfileAtom(candidateId as CandidateId),
    [candidateId],
  );
  const result = useAtomValue(profileAtom);

  return (
    <div>
      <AsyncResultView
        result={result}
        locale={locale}
        onSuccess={(profile) => (
          <>
            <h1 className="mb-6 text-2xl font-semibold text-neutral-900">
              {displayName(profile.name, locale)}
            </h1>
            <ul className="space-y-8 list-none p-0">
              {profile.candidacies.map((candidacy) => (
                <CandidacyBlock
                  key={`${candidacy.election.id}-${candidacy.constituency.id}`}
                  candidacy={candidacy}
                  locale={locale}
                />
              ))}
            </ul>
          </>
        )}
      />
      <p className="mt-6">
        <Link to="/" className="text-sm text-neutral-600 underline hover:text-neutral-900">
          ← {L.constituencies}
        </Link>
      </p>
    </div>
  );
}

function CandidacyBlock({
  candidacy,
  locale,
}: {
  candidacy: Candidacy;
  locale: keyof typeof labels;
}) {
  const L = labels[locale];

  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-neutral-900">
        <Link
          to="/constituencies/$constituencyId"
          params={{ constituencyId: candidacy.constituency.id }}
          className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-800"
        >
          {displayName(candidacy.constituency.name, locale)}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        {displayName(candidacy.election.name, locale)} ({candidacy.election.year}){" · "}
        {candidacy.party ? (
          <>
            {candidacy.party.abbreviation} · {displayName(candidacy.party.name, locale)}
          </>
        ) : (
          L.independent
        )}
      </p>
      <p className="mt-2 text-sm text-neutral-800">
        {L.votes}:{" "}
        <SourceLink source={candidacy.source}>
          {formatNumber(candidacy.totalVotes, locale)}
        </SourceLink>
        {" · "}
        {L.voteShare}:{" "}
        <SourceLink source={candidacy.source}>
          {formatPercent(candidacy.voteShare, locale)}
        </SourceLink>
        {candidacy.isWinner ? (
          <span className="ml-2 inline-block rounded border border-neutral-400 px-1.5 py-0.5 text-xs font-medium">
            {L.winner}
          </span>
        ) : null}
      </p>
      <AffidavitBlock affidavit={candidacy.affidavit} locale={locale} />
    </li>
  );
}

function AffidavitBlock({
  affidavit,
  locale,
}: {
  affidavit: Affidavit;
  locale: keyof typeof labels;
}) {
  const L = labels[locale];

  if (affidavit.status === "not_available") {
    return <p className="mt-4 text-sm text-neutral-600">{L.affidavitNotAvailable}</p>;
  }

  return (
    <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
      <h3 className="font-medium text-neutral-900">{L.affidavit}</h3>
      {affidavit.assets ? (
        <p>
          {L.assets}: ₹
          <SourceLink source={affidavit.assets.source}>
            {formatNumber(affidavit.assets.rupees, locale)}
          </SourceLink>
        </p>
      ) : null}
      {affidavit.liabilities ? (
        <p>
          {L.liabilities}: ₹
          <SourceLink source={affidavit.liabilities.source}>
            {formatNumber(affidavit.liabilities.rupees, locale)}
          </SourceLink>
        </p>
      ) : null}
      {affidavit.education ? (
        <p>
          {L.education}: {affidavit.education.declared} (
          <SourceLink source={affidavit.education.source}>{L.source}</SourceLink>)
        </p>
      ) : null}
      {affidavit.criminalCases.length > 0 ? (
        <>
          <p>{L.criminalCases}:</p>
          <ul className="list-disc space-y-1 pl-5">
            {affidavit.criminalCases.map((c, i) => (
              <li key={i}>
                {c.description} (<SourceLink source={c.source}>{L.source}</SourceLink>)
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        <SourceLink source={affidavit.document}>{L.source}</SourceLink>
      </p>
    </div>
  );
}

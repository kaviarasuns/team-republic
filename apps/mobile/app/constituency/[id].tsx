import { useAtomValue } from "@effect/atom-react";
import { LegendList } from "@legendapp/list/react-native";
import { constituencyResultAtom, formatNumber, formatPercent, labels } from "@team-republic/client";
import type { ConstituencyId, ResultRow } from "@team-republic/contracts";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AsyncResultView } from "../../src/async-result";
import { displayName, reservationLabel } from "../../src/display-name";
import { useLocale } from "../../src/locale-context";
import { SourceLink } from "../../src/source-link";

const partyLine = (row: ResultRow, locale: "en" | "ta"): string => {
  if (row.party === null) {
    return labels[locale].independent;
  }
  const name = displayName(row.party.name, locale);
  return `${row.party.abbreviation} · ${name}`;
};

const CandidateRow = ({
  row,
  locale,
}: {
  readonly row: ResultRow;
  readonly locale: "en" | "ta";
}) => (
  <View className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">{row.rank}</Text>
        <Text className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {displayName(row.name, locale)}
        </Text>
        <Text className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
          {partyLine(row, locale)}
        </Text>
      </View>
      {row.isWinner ? (
        <View className="rounded-md border border-neutral-400 px-2 py-1 dark:border-neutral-500">
          <Text className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
            {labels[locale].winner}
          </Text>
        </View>
      ) : null}
    </View>
    <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
      <SourceLink
        accessibilityLabel={labels[locale].votes}
        className="text-base text-neutral-900 underline dark:text-neutral-100"
        source={row.source}
      >
        {`${labels[locale].votes}: ${formatNumber(row.totalVotes, locale)}`}
      </SourceLink>
      <SourceLink
        accessibilityLabel={labels[locale].voteShare}
        className="text-base text-neutral-900 underline dark:text-neutral-100"
        source={row.source}
      >
        {`${labels[locale].voteShare}: ${formatPercent(row.voteShare, locale)}`}
      </SourceLink>
    </View>
    <View className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
      <View
        className="h-full rounded-full bg-neutral-500 dark:bg-neutral-400"
        style={{ width: `${Math.min(100, Math.max(0, row.voteShare))}%` }}
      />
    </View>
  </View>
);

export default function ConstituencyResultScreen() {
  const { locale } = useLocale();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const constituencyId = id as ConstituencyId;
  const resultAtom = useMemo(() => constituencyResultAtom(constituencyId), [constituencyId]);
  const result = useAtomValue(resultAtom);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <AsyncResultView locale={locale} result={result}>
        {(data) => {
          const aggregateSource = data.source;
          const reservation = reservationLabel(data.constituency.reservation, locale);

          return (
            <LegendList
              ListFooterComponent={
                aggregateSource ? (
                  <View className="mt-2 gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    {data.notaVotes !== null ? (
                      <SourceLink
                        accessibilityLabel={labels[locale].nota}
                        className="text-base text-neutral-900 underline dark:text-neutral-100"
                        source={aggregateSource}
                      >
                        {`${labels[locale].nota}: ${formatNumber(data.notaVotes, locale)}`}
                      </SourceLink>
                    ) : null}
                    <SourceLink
                      accessibilityLabel={labels[locale].totalVotes}
                      className="text-base font-medium text-neutral-900 underline dark:text-neutral-100"
                      source={aggregateSource}
                    >
                      {`${labels[locale].totalVotes}: ${formatNumber(data.totalVotes, locale)}`}
                    </SourceLink>
                    {data.margin !== null ? (
                      <SourceLink
                        accessibilityLabel={labels[locale].margin}
                        className="text-base text-neutral-900 underline dark:text-neutral-100"
                        source={aggregateSource}
                      >
                        {`${labels[locale].margin}: ${formatNumber(data.margin, locale)}`}
                      </SourceLink>
                    ) : null}
                  </View>
                ) : null
              }
              ListHeaderComponent={
                <View className="pb-4">
                  <Text className="text-sm text-neutral-600 dark:text-neutral-400">
                    {displayName(data.election.name, locale)} · {data.election.year}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {data.constituency.number}
                    {reservation ? ` · ${reservation}` : ""}
                  </Text>
                  <Text className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {displayName(data.constituency.name, locale)}
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
              data={data.candidates}
              estimatedItemSize={140}
              keyExtractor={(item) => item.candidateId}
              renderItem={({ item }) => <CandidateRow locale={locale} row={item} />}
            />
          );
        }}
      </AsyncResultView>
    </View>
  );
}

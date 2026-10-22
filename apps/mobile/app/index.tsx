import { useAtomValue } from "@effect/atom-react";
import { LegendList } from "@legendapp/list/react-native";
import { constituenciesAtom, labels, localizedName, type Locale } from "@team-republic/client";
import type { ConstituencySummary } from "@team-republic/contracts";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AsyncResultView } from "../src/async-result";
import { displayName, reservationLabel } from "../src/display-name";
import { useLocale } from "../src/locale-context";

const matchesQuery = (item: ConstituencySummary, query: string, locale: Locale): boolean => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  const numberText = String(item.number);
  if (numberText.includes(normalized)) {
    return true;
  }
  const en = item.name.en?.toLowerCase() ?? "";
  const ta = item.name.ta ?? "";
  if (en.includes(normalized) || ta.includes(normalized)) {
    return true;
  }
  const shown = localizedName(item.name, locale)?.toLowerCase() ?? "";
  return shown.includes(normalized);
};

export default function ConstituenciesScreen() {
  const { locale } = useLocale();
  const insets = useSafeAreaInsets();
  const listAtom = useMemo(() => constituenciesAtom(), []);
  const result = useAtomValue(listAtom);
  const [query, setQuery] = useState("");

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <AsyncResultView locale={locale} result={result}>
        {(data) => {
          const filtered = data.constituencies.filter((item) => matchesQuery(item, query, locale));
          const electionTitle = displayName(data.election.name, locale);

          return (
            <View className="flex-1 px-4 pb-4" style={{ paddingBottom: insets.bottom + 16 }}>
              <Text className="pb-2 text-sm text-neutral-600 dark:text-neutral-400">
                {electionTitle} · {data.election.year}
              </Text>
              <TextInput
                accessibilityLabel={labels[locale].constituencies}
                className="mb-3 min-h-12 rounded-xl border border-neutral-300 bg-neutral-50 px-4 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                onChangeText={setQuery}
                placeholder={labels[locale].search}
                value={query}
              />
              {filtered.length === 0 ? (
                <View className="flex-1 items-center justify-center p-6">
                  <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
                    {labels[locale].noSearchResults}
                  </Text>
                </View>
              ) : (
                <LegendList
                  data={filtered}
                  estimatedItemSize={72}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const reservation = reservationLabel(item.reservation, locale);
                    return (
                      <Link asChild href={`/constituency/${item.id}`}>
                        <Pressable className="mb-2 min-h-[72px] rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 active:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800">
                          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                            {item.number}
                            {reservation ? ` · ${reservation}` : ""}
                          </Text>
                          <Text className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                            {displayName(item.name, locale)}
                          </Text>
                        </Pressable>
                      </Link>
                    );
                  }}
                />
              )}
            </View>
          );
        }}
      </AsyncResultView>
    </View>
  );
}

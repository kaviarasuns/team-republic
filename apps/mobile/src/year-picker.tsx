import { useAtomValue } from "@effect/atom-react";
import { electionsAtom, labels, type Locale } from "@team-republic/client";
import type { ElectionId } from "@team-republic/contracts";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Pressable, ScrollView, Text, View } from "react-native";

/**
 * Chooses which general election the constituency list shows, as a row of
 * year buttons that scrolls sideways once there are many years.
 *
 * Renders nothing until the election list loads, when it fails, or when only
 * one general election is stored: the screen still works on the latest year.
 */
export function YearPicker({
  selected,
  onSelect,
  locale,
}: {
  /** The election on screen; null while it is still loading. */
  readonly selected: ElectionId | null;
  readonly onSelect: (electionId: ElectionId) => void;
  readonly locale: Locale;
}) {
  const result = useAtomValue(electionsAtom);
  if (!AsyncResult.isSuccess(result)) return null;
  const elections = result.value.elections.filter((election) => election.kind === "general");
  if (elections.length < 2) return null;
  const current = selected ?? elections[0]?.id ?? null;

  return (
    <View className="pb-3">
      <Text className="pb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {labels[locale].electionYear}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View accessibilityRole="radiogroup" className="flex-row gap-2">
          {elections.map((election) => {
            const isSelected = election.id === current;
            return (
              <Pressable
                key={election.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                onPress={() => onSelect(election.id)}
                className={
                  isSelected
                    ? "min-h-11 justify-center rounded-full bg-neutral-900 px-4 dark:bg-neutral-100"
                    : "min-h-11 justify-center rounded-full border border-neutral-300 px-4 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                }
              >
                <Text
                  className={
                    isSelected
                      ? "text-base font-medium text-white dark:text-neutral-900"
                      : "text-base text-neutral-900 dark:text-neutral-100"
                  }
                >
                  {election.year}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

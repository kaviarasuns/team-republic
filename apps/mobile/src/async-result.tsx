import { labels, type Locale } from "@team-republic/client";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const hasErrorTag = (error: unknown, tag: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  (error as { _tag: string })._tag === tag;

const messageForError = (error: unknown, locale: Locale): string => {
  if (hasErrorTag(error, "DataUnavailable")) {
    return labels[locale].dataUnavailable;
  }
  if (hasErrorTag(error, "ConstituencyNotFound") || hasErrorTag(error, "CandidateNotFound")) {
    return labels[locale].notFound;
  }
  if (hasErrorTag(error, "ElectionNotFound")) {
    return labels[locale].notFound;
  }
  return labels[locale].loadFailed;
};

export const AsyncResultView = <A, E>({
  result,
  locale,
  children,
}: {
  readonly result: AsyncResult.AsyncResult<A, E>;
  readonly locale: Locale;
  readonly children: (value: A) => ReactNode;
}) =>
  AsyncResult.matchWithWaiting(result, {
    onWaiting: () => (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator accessibilityLabel={labels[locale].loading} />
        <Text className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
          {labels[locale].loading}
        </Text>
      </View>
    ),
    onSuccess: ({ value }) => <>{children(value)}</>,
    onError: (error) => (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-base text-neutral-800 dark:text-neutral-200">
          {messageForError(error, locale)}
        </Text>
      </View>
    ),
    onDefect: () => (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-base text-neutral-800 dark:text-neutral-200">
          {labels[locale].loadFailed}
        </Text>
      </View>
    ),
  });

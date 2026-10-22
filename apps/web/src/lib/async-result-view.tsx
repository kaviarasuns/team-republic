import type { Locale } from "@team-republic/client";
import { labels } from "@team-republic/client";
import type { ReactNode } from "react";
import * as AsyncResult from "effect/reactivity/AsyncResult";

type AsyncResultViewProps<A, E> = {
  result: AsyncResult.AsyncResult<A, E>;
  locale: Locale;
  onSuccess: (value: A) => ReactNode;
};

function errorMessage(error: unknown, locale: Locale): ReactNode {
  const L = labels[locale];
  if (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    typeof (error as { _tag: unknown })._tag === "string"
  ) {
    const tag = (error as { _tag: string })._tag;
    switch (tag) {
      case "DataUnavailable":
        return (
          <p
            className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-neutral-700"
            role="status"
          >
            {L.dataUnavailable}
          </p>
        );
      case "ConstituencyNotFound":
      case "CandidateNotFound":
      case "ElectionNotFound":
        return (
          <p
            className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-neutral-700"
            role="status"
          >
            {L.notFound}
          </p>
        );
      default:
        break;
    }
  }
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-red-900" role="alert">
      {L.loadFailed}
    </p>
  );
}

export function AsyncResultView<A, E>({ result, locale, onSuccess }: AsyncResultViewProps<A, E>) {
  const L = labels[locale];

  return AsyncResult.matchWithWaiting(result, {
    onWaiting: () => (
      <p className="py-8 text-center text-neutral-600" role="status">
        {L.loading}
      </p>
    ),
    onSuccess: (success) => onSuccess(success.value),
    onError: (error) => errorMessage(error, locale),
    onDefect: () => (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-red-900" role="alert">
        {L.loadFailed}
      </p>
    ),
  });
}

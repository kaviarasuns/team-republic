import { useAtomValue } from "@effect/atom-react";
import { electionsAtom, labels, type Locale } from "@team-republic/client";
import type { ElectionId } from "@team-republic/contracts";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useId } from "react";

/**
 * Chooses which general election the constituency list shows.
 *
 * Renders nothing until the election list loads, when it fails, or when only
 * one general election is stored: the page still works on the latest year.
 */
export function YearPicker({
  selected,
  onSelect,
  locale,
}: {
  /** The election on screen; null while it is still loading. */
  selected: ElectionId | null;
  onSelect: (electionId: ElectionId) => void;
  locale: Locale;
}) {
  const id = useId();
  const result = useAtomValue(electionsAtom);
  if (!AsyncResult.isSuccess(result)) return null;
  const elections = result.value.elections.filter((election) => election.kind === "general");
  if (elections.length < 2) return null;
  const value = selected ?? elections[0]?.id ?? "";

  return (
    <div className="mb-4 flex items-center gap-3">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {labels[locale].electionYear}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onSelect(event.target.value as ElectionId)}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base shadow-sm"
      >
        {elections.map((election) => (
          <option key={election.id} value={election.id}>
            {election.year}
          </option>
        ))}
      </select>
    </div>
  );
}

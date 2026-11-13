import type { ConstituencyOutcome, PartyId, PartySeats } from "@team-republic/contracts";

/**
 * Map colours. Parties get a neutral categorical palette, never a party's own
 * colours (product-doc decision 2026-11-13).
 *
 * On a map any two seats can touch, so every colour pair must stay apart for
 * colour-blind readers. Only three categorical slots pass that all-pairs check
 * (dataviz reference palette, validated with --pairs all), so three parties
 * get a colour and every other party folds into "Other". Slot 3 (aqua) sits
 * under 3:1 contrast on the surface; the legend's seat counts and the seat
 * panel's party name carry the same information as text.
 */
export const PARTY_SLOTS = ["#2a78d6", "#eb6834", "#1baf7a"] as const;

/** Every party outside the three slots, and independents. */
export const OTHER_COLOR = "#c3c2b7";

/** A constituency with no recorded winner. */
export const NO_RESULT_COLOR = "#ecebe6";

/** Map background and the hairline between seats. */
export const SURFACE_COLOR = "#fcfcfb";

/** Outline of the hovered or selected seat. */
export const HIGHLIGHT_COLOR = "#0b0b0b";

/**
 * The parties that get a colour: the three with the most seats across every
 * stored general election. The list does not depend on the year shown, so a
 * party keeps its colour in every year.
 */
export const featuredParties = (
  seatTotals: ReadonlyArray<PartySeats>,
): ReadonlyMap<PartyId, string> => {
  const colors = new Map<PartyId, string>();
  seatTotals.slice(0, PARTY_SLOTS.length).forEach((entry, index) => {
    const color = PARTY_SLOTS[index];
    if (color !== undefined) colors.set(entry.party.id, color);
  });
  return colors;
};

export const partyColor = (
  outcome: ConstituencyOutcome,
  featured: ReadonlyMap<PartyId, string>,
): string => {
  if (outcome.winner === null) return NO_RESULT_COLOR;
  const party = outcome.winner.party;
  return (party === null ? undefined : featured.get(party.id)) ?? OTHER_COLOR;
};

/**
 * Winning margin as a share of the votes, in five bins on one blue ramp:
 * light is a close race, dark a comfortable win.
 */
export const MARGIN_BINS: ReadonlyArray<{ readonly below: number; readonly color: string }> = [
  { below: 2, color: "#b7d3f6" },
  { below: 5, color: "#86b6ef" },
  { below: 10, color: "#5598e7" },
  { below: 20, color: "#2a78d6" },
  { below: Number.POSITIVE_INFINITY, color: "#184f95" },
];

export const marginColor = (outcome: ConstituencyOutcome): string => {
  const share = outcome.marginShare;
  if (share === null) return NO_RESULT_COLOR;
  return (MARGIN_BINS.find((bin) => share < bin.below) ?? MARGIN_BINS[MARGIN_BINS.length - 1])!
    .color;
};

/** Legend text for a margin bin, such as "2–5%" or "≥ 20%". */
export const marginBinLabel = (index: number): string => {
  const bin = MARGIN_BINS[index];
  const lower = index === 0 ? null : MARGIN_BINS[index - 1]?.below;
  if (bin === undefined) return "";
  if (lower === null || lower === undefined) return `< ${bin.below}%`;
  if (bin.below === Number.POSITIVE_INFINITY) return `≥ ${lower}%`;
  return `${lower}–${bin.below}%`;
};

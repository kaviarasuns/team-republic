export type Reservation = "GEN" | "SC" | "ST";

export const isReservation = (value: string): value is Reservation =>
  value === "GEN" || value === "SC" || value === "ST";

const SUFFIX = /^(\S(?:.*\S)?)\s*\((SC|ST)\)$/;

/**
 * Splits a reserved-seat suffix off a constituency name.
 *
 * From 2026, ECI prints reserved seats as "PONNERI (SC)" in Detailed Results
 * and the successful-candidates list, while the summary sheet and general
 * seats print the bare name. "PONNERI (SC)" gives `{ name: "PONNERI",
 * reservation: "SC" }`; a name without a suffix gives `reservation: null`.
 */
export const splitReservationSuffix = (
  printed: string,
): { readonly name: string; readonly reservation: Reservation | null } => {
  const match = SUFFIX.exec(printed);
  if (match === null) return { name: printed, reservation: null };
  const name = match[1] ?? "";
  const reservation = match[2] ?? "";
  if (name === "" || !isReservation(reservation)) return { name: printed, reservation: null };
  return { name, reservation };
};

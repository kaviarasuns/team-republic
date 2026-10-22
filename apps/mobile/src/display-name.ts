import { labels, localizedName, type Locale } from "@team-republic/client";
import type { LocalizedName, Reservation } from "@team-republic/contracts";

export const displayName = (name: LocalizedName, locale: Locale): string =>
  localizedName(name, locale) ?? labels[locale].nameNotInSource;

export const reservationLabel = (
  reservation: Reservation | null,
  locale: Locale,
): string | null => {
  if (reservation === null) {
    return null;
  }
  return labels[locale].reserved[reservation];
};

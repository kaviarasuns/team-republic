import type { Locale } from "@team-republic/client";
import type { LocalizedName } from "@team-republic/contracts";
import { labels, localizedName } from "@team-republic/client";

export function displayName(name: LocalizedName, locale: Locale): string {
  return localizedName(name, locale) ?? labels[locale].nameNotInSource;
}

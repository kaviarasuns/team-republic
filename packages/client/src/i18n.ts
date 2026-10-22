import type { LocalizedName } from "@team-republic/contracts";

export type Locale = "en" | "ta";

/** UI labels. Data names come from source files and are never translated here. */
export const labels = {
  en: {
    appName: "Team Republic",
    constituencies: "Constituencies",
    constituency: "Constituency",
    results: "Results",
    candidate: "Candidate",
    party: "Party",
    independent: "Independent",
    votes: "Votes",
    voteShare: "Vote share",
    winner: "Winner",
    margin: "Margin",
    nota: "None of the above (NOTA)",
    totalVotes: "Total votes",
    source: "Source",
    reserved: { GEN: "General", SC: "Reserved (SC)", ST: "Reserved (ST)" },
    affidavitNotAvailable: "Affidavit details are not available yet.",
    nameNotInSource: "Not in source file",
    loading: "Loading…",
    notFound: "Not found",
    loadFailed: "Could not load data. Please try again.",
    language: "தமிழ்",
  },
  ta: {
    appName: "டீம் ரிபப்ளிக்",
    constituencies: "தொகுதிகள்",
    constituency: "தொகுதி",
    results: "முடிவுகள்",
    candidate: "வேட்பாளர்",
    party: "கட்சி",
    independent: "சுயேச்சை",
    votes: "வாக்குகள்",
    voteShare: "வாக்கு சதவீதம்",
    winner: "வெற்றியாளர்",
    margin: "வாக்கு வித்தியாசம்",
    nota: "மேற்கண்ட யாருமில்லை (நோட்டா)",
    totalVotes: "மொத்த வாக்குகள்",
    source: "ஆதாரம்",
    reserved: { GEN: "பொது", SC: "தனி (பட்டியல் சாதி)", ST: "தனி (பழங்குடியினர்)" },
    affidavitNotAvailable: "பிரமாணப் பத்திர விவரங்கள் இன்னும் கிடைக்கவில்லை.",
    nameNotInSource: "ஆதாரக் கோப்பில் இல்லை",
    loading: "ஏற்றுகிறது…",
    notFound: "கிடைக்கவில்லை",
    loadFailed: "தரவை ஏற்ற முடியவில்லை. மீண்டும் முயலவும்.",
    language: "English",
  },
} as const;

export type Labels = (typeof labels)[Locale];

/**
 * Picks the name in the requested language, falling back to the other form the
 * source printed. Returns null only when the source has neither.
 */
export const localizedName = (name: LocalizedName, locale: Locale): string | null =>
  (locale === "ta" ? (name.ta ?? name.en) : (name.en ?? name.ta)) ?? null;

export const formatNumber = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(locale === "ta" ? "ta-IN" : "en-IN").format(value);

export const formatPercent = (value: number, locale: Locale): string =>
  `${new Intl.NumberFormat(locale === "ta" ? "ta-IN" : "en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;

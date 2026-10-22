import { describe, expect, it } from "@effect/vitest";
import { assembleTn2021, type Tn2021Sources } from "../../src/ingest/assemble-tn2021.ts";
import type {
  ParsedCandidate,
  ParsedConstituencyResult,
  ParsedDetailedResults,
} from "../../src/ingest/parse-detailed-results.ts";
import type { ParsedConstituencySummary } from "../../src/ingest/parse-constituency-summary.ts";
import type { ParsedParty } from "../../src/ingest/parse-parties.ts";
import type { ParsedWinner } from "../../src/ingest/parse-winners.ts";
import { CONSTITUENCY_COUNT } from "../../src/ingest/tn2021-constants.ts";

// Synthetic fixture. These names and numbers are not election results.

const candidate = (
  name: string,
  fileRank: number | null,
  partyAbbreviation: string,
  generalVotes: number,
  postalVotes: number,
  sourceRow: number,
): ParsedCandidate => ({
  name,
  fileRank,
  sex: "MALE",
  age: 40,
  category: "GENERAL",
  partyAbbreviation,
  votes: { generalVotes, postalVotes, totalVotes: generalVotes + postalVotes },
  sourceSheet: "Worksheet",
  sourceRow,
});

const constituency = (
  number: number,
  ranks: readonly [number | null, number | null] = [1, 2],
  votes: readonly [readonly [number, number], readonly [number, number]] = [
    [8, 2],
    [3, 1],
  ],
): ParsedConstituencyResult => {
  const candidates = [
    candidate("Candidate A", ranks[0], "TPA", votes[0][0], votes[0][1], number * 10 + 1),
    candidate("Candidate B", ranks[1], "IND", votes[1][0], votes[1][1], number * 10 + 2),
  ];
  const general = candidates[0]!.votes.generalVotes! + candidates[1]!.votes.generalVotes! + 1;
  const postal = candidates[0]!.votes.postalVotes! + candidates[1]!.votes.postalVotes! + 0;
  return {
    number,
    name: `Test AC ${number}`,
    electors: 1000 + number,
    nota: {
      generalVotes: 1,
      postalVotes: 0,
      totalVotes: 1,
      sourceSheet: "Worksheet",
      sourceRow: number * 10 + 3,
    },
    candidates,
    printedTotal: {
      generalVotes: general,
      postalVotes: postal,
      totalVotes: general + postal,
      sourceSheet: "Worksheet",
      sourceRow: number * 10 + 4,
    },
  };
};

const validSources = (): Tn2021Sources => {
  const constituencies = Array.from({ length: CONSTITUENCY_COUNT }, (_, index) =>
    constituency(index + 1),
  );
  const grand = constituencies.reduce(
    (sum, item) => ({
      general: sum.general + (item.printedTotal.generalVotes ?? 0),
      postal: sum.postal + (item.printedTotal.postalVotes ?? 0),
      total: sum.total + item.printedTotal.totalVotes,
    }),
    { general: 0, postal: 0, total: 0 },
  );
  const detailed: ParsedDetailedResults = {
    sheet: "Worksheet",
    constituencies,
    grandTotal: {
      generalVotes: grand.general,
      postalVotes: grand.postal,
      totalVotes: grand.total,
      sourceSheet: "Worksheet",
      sourceRow: 9000,
    },
  };
  const parties: ParsedParty[] = [
    { abbreviation: "TPA", name: "Test Party A", sourceSheet: "Worksheet", sourceRow: 4 },
    { abbreviation: "TPB", name: "Test Party B", sourceSheet: "Worksheet", sourceRow: 5 },
    { abbreviation: "IND", name: "Independent", sourceSheet: "Worksheet", sourceRow: 6 },
    { abbreviation: "NOTA", name: "None of the Above", sourceSheet: "Worksheet", sourceRow: 7 },
  ];
  const winners: ParsedWinner[] = constituencies.map((item) => ({
    constituencyName: item.name,
    candidateName: "Candidate A",
    partyAbbreviation: "TPA",
    sourceSheet: "Worksheet",
    sourceRow: 100 + item.number,
  }));
  const summaries: ParsedConstituencySummary[] = constituencies.map((item) => ({
    number: item.number,
    name: item.name,
    reservation: item.number === 2 ? "SC" : item.number === 3 ? "ST" : "GEN",
    district: null,
    electors: item.electors ?? 0,
    electorsRow: 13,
    notaVotes: item.nota.totalVotes,
    notaRow: 30,
    sourceSheet: `S22-${item.number}-${item.name}`,
    headerRow: 2,
  }));
  return { detailed, parties, winners, summaries };
};

const replaceConstituency = (
  sources: Tn2021Sources,
  index: number,
  next: ParsedConstituencyResult,
): Tn2021Sources => ({
  ...sources,
  detailed: {
    ...sources.detailed,
    constituencies: sources.detailed.constituencies.map((item, itemIndex) =>
      itemIndex === index ? next : item,
    ),
  },
});

const withGrandTotal = (sources: Tn2021Sources): Tn2021Sources => {
  const grand = sources.detailed.constituencies.reduce(
    (sum, item) => ({
      general: sum.general + (item.printedTotal.generalVotes ?? 0),
      postal: sum.postal + (item.printedTotal.postalVotes ?? 0),
      total: sum.total + item.printedTotal.totalVotes,
    }),
    { general: 0, postal: 0, total: 0 },
  );
  return {
    ...sources,
    detailed: {
      ...sources.detailed,
      grandTotal: {
        ...sources.detailed.grandTotal,
        generalVotes: grand.general,
        postalVotes: grand.postal,
        totalVotes: grand.total,
      },
    },
  };
};

describe("assembleTn2021", () => {
  it("keeps file ranks, leaves IND and NOTA out of the party table, and checks the winner set", () => {
    const assembled = assembleTn2021(validSources());
    expect(assembled.constituencies).toHaveLength(CONSTITUENCY_COUNT);
    expect(assembled.parties.map((party) => party.abbreviation)).toEqual(["TPA", "TPB"]);
    const second = assembled.constituencies[1];
    expect(second?.number).toBe(2);
    expect(second?.reservation).toBe("SC");
    expect(second?.districtEn).toBeNull();
    expect(second?.notaVotes).toBe(1);
    expect(second?.sourceRow).toBe(23);
    expect(
      second?.candidates.map((candidate) => [
        candidate.rank,
        candidate.isWinner,
        candidate.partyAbbreviation,
        candidate.totalVotes,
      ]),
    ).toEqual([
      [1, true, "TPA", 10],
      [2, false, null, 4],
    ]);
    expect(assembled.constituencies[2]?.reservation).toBe("ST");
  });

  it("keeps a printed rank when two candidates have the same votes", () => {
    const tied = constituency(
      1,
      [1, 4],
      [
        [5, 0],
        [5, 0],
      ],
    );
    const sources = withGrandTotal(replaceConstituency(validSources(), 0, tied));
    const assembled = assembleTn2021(sources);
    expect(
      assembled.constituencies[0]?.candidates.map((candidate) => [
        candidate.nameEn,
        candidate.rank,
        candidate.isWinner,
      ]),
    ).toEqual([
      ["Candidate A", 1, true],
      ["Candidate B", 4, false],
    ]);
  });

  it("aborts a vote tie when the file prints no rank", () => {
    const tied = constituency(
      1,
      [null, null],
      [
        [5, 0],
        [5, 0],
      ],
    );
    const sources = replaceConstituency(validSources(), 0, tied);
    expect(() => assembleTn2021(sources)).toThrow(/tie on 5 votes/);
  });

  it("aborts when a constituency is missing", () => {
    const sources = validSources();
    const shortened: Tn2021Sources = {
      ...sources,
      detailed: {
        ...sources.detailed,
        constituencies: sources.detailed.constituencies.slice(0, -1),
      },
      summaries: sources.summaries.slice(0, -1),
      winners: sources.winners.slice(0, -1),
    };
    expect(() => assembleTn2021(shortened)).toThrow(/expected 234 constituencies, found 233/);
  });

  it("aborts when candidate votes plus NOTA do not match the printed total", () => {
    const sources = validSources();
    const first = sources.detailed.constituencies[0]!;
    const general = (first.printedTotal.generalVotes ?? 0) + 5;
    const postal = first.printedTotal.postalVotes ?? 0;
    const broken = replaceConstituency(sources, 0, {
      ...first,
      printedTotal: {
        ...first.printedTotal,
        generalVotes: general,
        postalVotes: postal,
        totalVotes: general + postal,
      },
    });
    expect(() => assembleTn2021(broken)).toThrow(/general votes/);
  });

  it("aborts when general plus postal does not equal total", () => {
    const sources = validSources();
    const first = sources.detailed.constituencies[0]!;
    const candidateA = first.candidates[0]!;
    const broken = replaceConstituency(sources, 0, {
      ...first,
      candidates: [
        { ...candidateA, votes: { ...candidateA.votes, postalVotes: 99 } },
        first.candidates[1]!,
      ],
    });
    expect(() => assembleTn2021(broken)).toThrow(/does not equal total/);
  });

  it("aborts when the successful-candidates file names a different winner", () => {
    const sources = validSources();
    const winner = sources.winners[4]!;
    const broken: Tn2021Sources = {
      ...sources,
      winners: sources.winners.map((item, index) =>
        index === 4 ? { ...winner, candidateName: "Someone Else" } : item,
      ),
    };
    expect(() => assembleTn2021(broken)).toThrow(/successful-candidates row/);
  });

  it("aborts when a constituency has fewer than two candidates", () => {
    const sources = validSources();
    const first = sources.detailed.constituencies[0]!;
    const only = first.candidates[0]!;
    const general = (only.votes.generalVotes ?? 0) + 1;
    const postal = only.votes.postalVotes ?? 0;
    const broken = replaceConstituency(sources, 0, {
      ...first,
      candidates: [only],
      printedTotal: {
        ...first.printedTotal,
        generalVotes: general,
        postalVotes: postal,
        totalVotes: general + postal,
      },
    });
    expect(() => assembleTn2021(broken)).toThrow(/expected at least 2/);
  });

  it("aborts when the summary sheet disagrees on electors", () => {
    const sources = validSources();
    const summary = sources.summaries[0]!;
    const broken: Tn2021Sources = {
      ...sources,
      summaries: sources.summaries.map((item, index) =>
        index === 0 ? { ...summary, electors: 1 } : item,
      ),
    };
    expect(() => assembleTn2021(broken)).toThrow(/electors are/);
  });

  it("aborts when a candidate party is not in the parties list", () => {
    const sources = validSources();
    const first = sources.detailed.constituencies[0]!;
    const candidateB = first.candidates[1]!;
    const broken = replaceConstituency(sources, 0, {
      ...first,
      candidates: [first.candidates[0]!, { ...candidateB, partyAbbreviation: "ZZZ" }],
    });
    expect(() => assembleTn2021(broken)).toThrow(/not in the parties list/);
  });
});

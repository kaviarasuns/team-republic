import { describe, expect, it } from "@effect/vitest";
import { assembleResults, type ResultSources } from "../../src/ingest/assemble.ts";
import type {
  ParsedCandidate,
  ParsedConstituencyResult,
  ParsedDetailedResults,
} from "../../src/ingest/parse-detailed-results.ts";
import type { ParsedConstituencySummary } from "../../src/ingest/parse-constituency-summary.ts";
import type { ParsedParty } from "../../src/ingest/parse-parties.ts";
import type { ParsedWinner } from "../../src/ingest/parse-winners.ts";
import { CONSTITUENCY_COUNT } from "../../src/ingest/elections.ts";

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
    reservationSuffix: null,
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

const validSources = (): ResultSources => {
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
    constituencyNumber: null,
    constituencyName: item.name,
    candidateName: "Candidate A",
    partyAbbreviation: "TPA",
    totalVotes: null,
    runnerUp: null,
    margin: null,
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
  sources: ResultSources,
  index: number,
  next: ParsedConstituencyResult,
): ResultSources => ({
  ...sources,
  detailed: {
    ...sources.detailed,
    constituencies: sources.detailed.constituencies.map((item, itemIndex) =>
      itemIndex === index ? next : item,
    ),
  },
});

/** The 2026 successful-candidates layout: AC number, winner votes, runner-up and margin. */
const withListedFigures = (sources: ResultSources): ResultSources => ({
  ...sources,
  winners: sources.winners.map((winner, index) => ({
    ...winner,
    constituencyNumber: index + 1,
    totalVotes: 10,
    runnerUp: { partyAbbreviation: "IND", totalVotes: 4 },
    margin: 6,
  })),
});

const replaceWinner = (
  sources: ResultSources,
  index: number,
  change: (winner: ParsedWinner) => ParsedWinner,
): ResultSources => ({
  ...sources,
  winners: sources.winners.map((item, itemIndex) => (itemIndex === index ? change(item) : item)),
});

const withGrandTotal = (sources: ResultSources): ResultSources => {
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

describe("assembleResults", () => {
  it("keeps file ranks, leaves IND and NOTA out of the party table, and checks the winner set", () => {
    const assembled = assembleResults(validSources());
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
    const assembled = assembleResults(sources);
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
    expect(() => assembleResults(sources)).toThrow(/tie on 5 votes/);
  });

  it("aborts when a constituency is missing", () => {
    const sources = validSources();
    const shortened: ResultSources = {
      ...sources,
      detailed: {
        ...sources.detailed,
        constituencies: sources.detailed.constituencies.slice(0, -1),
      },
      summaries: sources.summaries.slice(0, -1),
      winners: sources.winners.slice(0, -1),
    };
    expect(() => assembleResults(shortened)).toThrow(/expected 234 constituencies, found 233/);
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
    expect(() => assembleResults(broken)).toThrow(/general votes/);
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
    expect(() => assembleResults(broken)).toThrow(/does not equal total/);
  });

  it("aborts when the successful-candidates file names a different winner", () => {
    const sources = validSources();
    const winner = sources.winners[4]!;
    const broken: ResultSources = {
      ...sources,
      winners: sources.winners.map((item, index) =>
        index === 4 ? { ...winner, candidateName: "Someone Else" } : item,
      ),
    };
    expect(() => assembleResults(broken)).toThrow(/successful-candidates row/);
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
    expect(() => assembleResults(broken)).toThrow(/expected at least 2/);
  });

  it("aborts when the summary sheet disagrees on electors", () => {
    const sources = validSources();
    const summary = sources.summaries[0]!;
    const broken: ResultSources = {
      ...sources,
      summaries: sources.summaries.map((item, index) =>
        index === 0 ? { ...summary, electors: 1 } : item,
      ),
    };
    expect(() => assembleResults(broken)).toThrow(/electors are/);
  });

  it("aborts when a candidate party is not in the parties list", () => {
    const sources = validSources();
    const first = sources.detailed.constituencies[0]!;
    const candidateB = first.candidates[1]!;
    const broken = replaceConstituency(sources, 0, {
      ...first,
      candidates: [first.candidates[0]!, { ...candidateB, partyAbbreviation: "ZZZ" }],
    });
    expect(() => assembleResults(broken)).toThrow(/not in the parties list/);
  });

  it("accepts a successful-candidates file that prints AC numbers, votes, runner-up and margin", () => {
    const assembled = assembleResults(withListedFigures(validSources()));
    expect(assembled.constituencies).toHaveLength(CONSTITUENCY_COUNT);
  });

  it("aborts when a listed AC number points at a different constituency", () => {
    const sources = replaceWinner(withListedFigures(validSources()), 4, (winner) => ({
      ...winner,
      constituencyNumber: 6,
    }));
    expect(() => assembleResults(sources)).toThrow(
      /AC 6 is named "Test AC 5", Detailed Results names it "Test AC 6"/,
    );
  });

  it("aborts when the listed winner votes differ from Detailed Results", () => {
    const sources = replaceWinner(withListedFigures(validSources()), 4, (winner) => ({
      ...winner,
      totalVotes: 11,
    }));
    expect(() => assembleResults(sources)).toThrow(
      /winner has 10 votes in Detailed Results and 11/,
    );
  });

  it("aborts when the listed runner-up differs from rank 2", () => {
    const sources = replaceWinner(withListedFigures(validSources()), 4, (winner) => ({
      ...winner,
      runnerUp: { partyAbbreviation: "TPB", totalVotes: 4 },
    }));
    expect(() => assembleResults(sources)).toThrow(/rank 2 is IND with 4 votes/);
  });

  it("aborts when the listed margin differs from the vote gap", () => {
    const sources = replaceWinner(withListedFigures(validSources()), 4, (winner) => ({
      ...winner,
      margin: 7,
    }));
    expect(() => assembleResults(sources)).toThrow(/margin of 7, Detailed Results gives 6/);
  });

  it("aborts when a printed (SC) suffix disagrees with the summary reservation", () => {
    const sources = validSources();
    const first = sources.detailed.constituencies[0]!;
    const broken = replaceConstituency(sources, 0, { ...first, reservationSuffix: "SC" });
    expect(() => assembleResults(broken)).toThrow(/prints \(SC\), the summary sheet .* says GEN/);
  });

  it("accepts a printed suffix that matches the summary reservation", () => {
    const sources = validSources();
    const second = sources.detailed.constituencies[1]!;
    const matched = replaceConstituency(sources, 1, { ...second, reservationSuffix: "SC" });
    expect(assembleResults(matched).constituencies[1]?.reservation).toBe("SC");
  });
});

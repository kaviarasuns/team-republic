import { ingestFail } from "./errors.ts";
import type {
  ParsedCandidate,
  ParsedDetailedResults,
  VoteBreakdown,
} from "./parse-detailed-results.ts";
import type { ParsedConstituencySummary, Reservation } from "./parse-constituency-summary.ts";
import type { ParsedParty } from "./parse-parties.ts";
import type { ParsedWinner } from "./parse-winners.ts";
import { CONSTITUENCY_COUNT } from "./tn2021-constants.ts";

/**
 * Joins the four workbooks and checks them before anything is written.
 *
 * The successful-candidates file has no AC number. The number used in the
 * comparison is the Detailed Results number of the constituency whose name
 * matches exactly. A name that does not match is an error, not a fuzzy match.
 *
 * Reservation is read from the constituency-summary sheet. Electors and NOTA
 * in that sheet must equal the Detailed Results figures. The stored
 * constituency cites the Detailed Results NOTA row, which is the single row
 * that prints the AC number, the AC name, total electors, and NOTA votes.
 * The summary sheet is the only place the reservation is printed; the schema
 * has one source pointer per constituency, so that second row is not stored.
 */

export interface AssembledCandidate {
  readonly nameEn: string;
  readonly sex: string | null;
  readonly age: number | null;
  readonly category: string | null;
  /** Null for an independent (party abbreviation IND). */
  readonly partyAbbreviation: string | null;
  readonly generalVotes: number | null;
  readonly postalVotes: number | null;
  readonly totalVotes: number;
  readonly rank: number;
  readonly isWinner: boolean;
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

export interface AssembledConstituency {
  readonly number: number;
  readonly nameEn: string;
  readonly reservation: Reservation;
  readonly districtEn: string | null;
  readonly electors: number | null;
  readonly notaVotes: number;
  readonly sourceSheet: string;
  readonly sourceRow: number;
  readonly candidates: readonly AssembledCandidate[];
}

export interface AssembledParty {
  readonly abbreviation: string;
  readonly nameEn: string;
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

export interface AssembledTn2021 {
  readonly constituencies: readonly AssembledConstituency[];
  readonly parties: readonly AssembledParty[];
}

export interface Tn2021Sources {
  readonly detailed: ParsedDetailedResults;
  readonly parties: readonly ParsedParty[];
  readonly winners: readonly ParsedWinner[];
  readonly summaries: readonly ParsedConstituencySummary[];
}

const addUp = (general: number | null, postal: number | null, total: number, where: string) => {
  if (general !== null && postal !== null && general + postal !== total) {
    ingestFail(`${where}: general ${general} + postal ${postal} does not equal total ${total}`);
  }
};

const columnSum = (
  candidates: readonly ParsedCandidate[],
  nota: VoteBreakdown,
  pick: (votes: VoteBreakdown) => number | null,
  printed: number | null,
  where: string,
) => {
  if (printed === null) return;
  const parts = [...candidates.map((candidate) => pick(candidate.votes)), pick(nota)];
  if (parts.some((part) => part === null)) {
    ingestFail(
      `${where}: a printed total cannot be checked because a candidate or NOTA figure is blank`,
    );
  }
  const sum = parts.reduce<number>((total, part) => total + (part ?? 0), 0);
  if (sum !== printed)
    ingestFail(`${where}: candidate votes plus NOTA are ${sum}, the file prints ${printed}`);
};

const ranksFor = (candidates: readonly ParsedCandidate[], where: string): number[] => {
  const fileRanks = candidates.map((candidate) => candidate.fileRank);
  const present = fileRanks.filter((rank): rank is number => rank !== null);
  if (present.length === candidates.length) {
    const seen = new Set<number>();
    for (const rank of present) {
      if (rank < 1) ingestFail(`${where}: rank ${rank} is not a positive integer`);
      if (seen.has(rank)) ingestFail(`${where}: rank ${rank} is printed twice`);
      seen.add(rank);
    }
    return present;
  }
  if (present.length > 0)
    ingestFail(`${where}: some candidates have a printed rank and some do not`);

  const order = candidates.map((candidate, index) => ({
    index,
    votes: candidate.votes.totalVotes,
  }));
  order.sort((left, right) => right.votes - left.votes || left.index - right.index);
  for (let index = 1; index < order.length; index++) {
    const previous = order[index - 1];
    const current = order[index];
    if (previous !== undefined && current !== undefined && previous.votes === current.votes) {
      ingestFail(`${where}: tie on ${current.votes} votes and the file prints no rank`);
    }
  }
  const ranks = Array.from({ length: candidates.length }, () => 0);
  for (const [position, entry] of order.entries()) {
    if (entry === undefined) ingestFail(`${where}: missing candidate while ranking`);
    ranks[entry.index] = position + 1;
  }
  return ranks;
};

export const assembleTn2021 = (sources: Tn2021Sources): AssembledTn2021 => {
  const { constituencies } = sources.detailed;
  if (constituencies.length !== CONSTITUENCY_COUNT) {
    ingestFail(`expected ${CONSTITUENCY_COUNT} constituencies, found ${constituencies.length}`);
  }
  const numbers = constituencies
    .map((constituency) => constituency.number)
    .sort((left, right) => left - right);
  for (let index = 0; index < CONSTITUENCY_COUNT; index++) {
    if (numbers[index] !== index + 1) {
      ingestFail(
        `constituency numbers are not 1..${CONSTITUENCY_COUNT}; position ${index + 1} is ${numbers[index]}`,
      );
    }
  }

  const partyByAbbreviation = new Map<string, ParsedParty>();
  for (const party of sources.parties) {
    if (partyByAbbreviation.has(party.abbreviation)) {
      ingestFail(`duplicate party abbreviation ${party.abbreviation}`);
    }
    partyByAbbreviation.set(party.abbreviation, party);
  }

  const summaryByNumber = new Map<number, ParsedConstituencySummary>();
  for (const summary of sources.summaries) {
    if (summaryByNumber.has(summary.number))
      ingestFail(`duplicate constituency summary for AC ${summary.number}`);
    summaryByNumber.set(summary.number, summary);
  }
  if (summaryByNumber.size !== CONSTITUENCY_COUNT) {
    ingestFail(
      `expected ${CONSTITUENCY_COUNT} constituency summaries, found ${summaryByNumber.size}`,
    );
  }

  const numberByName = new Map<string, number>();
  for (const constituency of constituencies) {
    if (numberByName.has(constituency.name))
      ingestFail(`duplicate constituency name ${JSON.stringify(constituency.name)}`);
    numberByName.set(constituency.name, constituency.number);
  }
  const winnerByNumber = new Map<number, ParsedWinner>();
  for (const winner of sources.winners) {
    const number = numberByName.get(winner.constituencyName);
    if (number === undefined) {
      ingestFail(
        `successful-candidates row ${winner.sourceRow}: constituency ${JSON.stringify(winner.constituencyName)} does not match a Detailed Results name`,
      );
    }
    if (winnerByNumber.has(number))
      ingestFail(`AC ${number} has two rows in the successful-candidates file`);
    winnerByNumber.set(number, winner);
  }

  const grand = { general: 0, postal: 0, total: 0 };
  const assembled: AssembledConstituency[] = constituencies.map((constituency) => {
    const where = `AC ${constituency.number} ${constituency.name}`;
    if (constituency.candidates.length < 2) {
      ingestFail(`${where}: ${constituency.candidates.length} candidates, expected at least 2`);
    }
    const summary = summaryByNumber.get(constituency.number);
    if (summary === undefined) ingestFail(`${where}: no constituency-summary sheet`);
    if (summary.name !== constituency.name) {
      ingestFail(
        `${where}: name ${JSON.stringify(constituency.name)} in Detailed Results, ${JSON.stringify(summary.name)} in the summary sheet ${summary.sourceSheet}`,
      );
    }
    if (summary.electors !== constituency.electors) {
      ingestFail(
        `${where}: electors are ${constituency.electors} in Detailed Results and ${summary.electors} on summary row ${summary.electorsRow}`,
      );
    }
    if (summary.notaVotes !== constituency.nota.totalVotes) {
      ingestFail(
        `${where}: NOTA votes are ${constituency.nota.totalVotes} on Detailed Results row ${constituency.nota.sourceRow} and ${summary.notaVotes} on summary row ${summary.notaRow}`,
      );
    }

    addUp(
      constituency.nota.generalVotes,
      constituency.nota.postalVotes,
      constituency.nota.totalVotes,
      `${where} NOTA row ${constituency.nota.sourceRow}`,
    );
    addUp(
      constituency.printedTotal.generalVotes,
      constituency.printedTotal.postalVotes,
      constituency.printedTotal.totalVotes,
      `${where} TURN OUT row ${constituency.printedTotal.sourceRow}`,
    );
    for (const candidate of constituency.candidates) {
      addUp(
        candidate.votes.generalVotes,
        candidate.votes.postalVotes,
        candidate.votes.totalVotes,
        `${where} row ${candidate.sourceRow} ${candidate.name}`,
      );
    }
    columnSum(
      constituency.candidates,
      constituency.nota,
      (votes) => votes.generalVotes,
      constituency.printedTotal.generalVotes,
      `${where} general votes`,
    );
    columnSum(
      constituency.candidates,
      constituency.nota,
      (votes) => votes.postalVotes,
      constituency.printedTotal.postalVotes,
      `${where} postal votes`,
    );
    columnSum(
      constituency.candidates,
      constituency.nota,
      (votes) => votes.totalVotes,
      constituency.printedTotal.totalVotes,
      `${where} total votes`,
    );

    if (
      constituency.printedTotal.generalVotes === null ||
      constituency.printedTotal.postalVotes === null
    ) {
      ingestFail(`${where}: TURN OUT row does not print both general and postal totals`);
    }
    grand.general += constituency.printedTotal.generalVotes;
    grand.postal += constituency.printedTotal.postalVotes;
    grand.total += constituency.printedTotal.totalVotes;

    const ranks = ranksFor(constituency.candidates, where);
    const winnerIndexes = ranks.flatMap((rank, index) => (rank === 1 ? [index] : []));
    if (winnerIndexes.length !== 1)
      ingestFail(`${where}: found ${winnerIndexes.length} rank-1 candidates`);
    const winnerIndex = winnerIndexes[0];
    if (winnerIndex === undefined) ingestFail(`${where}: missing rank-1 candidate`);
    const winner = constituency.candidates[winnerIndex];
    if (winner === undefined) ingestFail(`${where}: missing rank-1 candidate`);
    for (const candidate of constituency.candidates) {
      if (candidate.votes.totalVotes > winner.votes.totalVotes) {
        ingestFail(
          `${where}: rank 1 ${winner.name} has ${winner.votes.totalVotes} votes but ${candidate.name} has ${candidate.votes.totalVotes}`,
        );
      }
    }
    const listed = winnerByNumber.get(constituency.number);
    if (listed === undefined) ingestFail(`${where}: no row in the successful-candidates file`);
    if (
      listed.candidateName !== winner.name ||
      listed.partyAbbreviation !== winner.partyAbbreviation
    ) {
      ingestFail(
        `${where}: Detailed Results rank 1 is ${JSON.stringify(winner.name)} (${winner.partyAbbreviation}), successful-candidates row ${listed.sourceRow} is ${JSON.stringify(listed.candidateName)} (${listed.partyAbbreviation})`,
      );
    }

    const candidates: AssembledCandidate[] = constituency.candidates.map((candidate, index) => {
      const rank = ranks[index];
      if (rank === undefined) ingestFail(`${where}: missing rank for ${candidate.name}`);
      if (
        candidate.partyAbbreviation !== "IND" &&
        !partyByAbbreviation.has(candidate.partyAbbreviation)
      ) {
        ingestFail(
          `${where} row ${candidate.sourceRow}: party ${candidate.partyAbbreviation} is not in the parties list`,
        );
      }
      if (candidate.partyAbbreviation === "NOTA") {
        ingestFail(`${where} row ${candidate.sourceRow}: a candidate line is marked NOTA`);
      }
      return {
        nameEn: candidate.name,
        sex: candidate.sex,
        age: candidate.age,
        category: candidate.category,
        partyAbbreviation:
          candidate.partyAbbreviation === "IND" ? null : candidate.partyAbbreviation,
        generalVotes: candidate.votes.generalVotes,
        postalVotes: candidate.votes.postalVotes,
        totalVotes: candidate.votes.totalVotes,
        rank,
        isWinner: rank === 1,
        sourceSheet: candidate.sourceSheet,
        sourceRow: candidate.sourceRow,
      };
    });

    return {
      number: constituency.number,
      nameEn: constituency.name,
      reservation: summary.reservation,
      districtEn: summary.district,
      electors: constituency.electors,
      notaVotes: constituency.nota.totalVotes,
      sourceSheet: constituency.nota.sourceSheet,
      sourceRow: constituency.nota.sourceRow,
      candidates,
    };
  });

  if (winnerByNumber.size !== CONSTITUENCY_COUNT) {
    ingestFail(
      `successful-candidates file has ${winnerByNumber.size} constituencies, expected ${CONSTITUENCY_COUNT}`,
    );
  }
  const printedGrand = sources.detailed.grandTotal;
  addUp(
    printedGrand.generalVotes,
    printedGrand.postalVotes,
    printedGrand.totalVotes,
    `GRAND TOTAL row ${printedGrand.sourceRow}`,
  );
  if (
    printedGrand.generalVotes !== grand.general ||
    printedGrand.postalVotes !== grand.postal ||
    printedGrand.totalVotes !== grand.total
  ) {
    ingestFail(
      `GRAND TOTAL row ${printedGrand.sourceRow} prints ${printedGrand.generalVotes}/${printedGrand.postalVotes}/${printedGrand.totalVotes}, constituency totals sum to ${grand.general}/${grand.postal}/${grand.total}`,
    );
  }

  const parties = sources.parties
    .filter((party) => party.abbreviation !== "IND" && party.abbreviation !== "NOTA")
    .map((party) => ({
      abbreviation: party.abbreviation,
      nameEn: party.name,
      sourceSheet: party.sourceSheet,
      sourceRow: party.sourceRow,
    }));

  return {
    constituencies: assembled.sort((left, right) => left.number - right.number),
    parties,
  };
};

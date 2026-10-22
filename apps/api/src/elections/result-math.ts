export interface VoteRow {
  readonly totalVotes: number;
}

/**
 * Sum of every vote line the source file prints for a constituency, NOTA
 * included. Vote share is computed against this, per the product doc.
 */
export const constituencyTotal = (rows: ReadonlyArray<VoteRow>, notaVotes: number | null): number =>
  rows.reduce((sum, row) => sum + row.totalVotes, 0) + (notaVotes ?? 0);

/** Percent rounded to two decimals. Zero when nothing was polled. */
export const voteShare = (votes: number, total: number): number =>
  total === 0 ? 0 : Math.round((votes / total) * 10_000) / 100;

/** Winner minus runner-up, by votes. Null with fewer than two candidates. */
export const margin = (rows: ReadonlyArray<VoteRow>): number | null => {
  if (rows.length < 2) return null;
  const sorted = rows.map((row) => row.totalVotes).sort((a, b) => b - a);
  return sorted[0]! - sorted[1]!;
};

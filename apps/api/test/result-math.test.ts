import { describe, expect, it } from "@effect/vitest";
import { constituencyTotal, margin, voteShare } from "../src/elections/result-math.ts";

describe("result math", () => {
  it("includes NOTA in the constituency total", () => {
    expect(constituencyTotal([{ totalVotes: 600 }, { totalVotes: 300 }], 100)).toBe(1000);
  });

  it("treats a missing NOTA line as zero", () => {
    expect(constituencyTotal([{ totalVotes: 600 }], null)).toBe(600);
  });

  it("rounds vote share to two decimals", () => {
    expect(voteShare(1, 3)).toBe(33.33);
    expect(voteShare(0, 0)).toBe(0);
  });

  it("computes margin from the top two candidates regardless of order", () => {
    expect(margin([{ totalVotes: 300 }, { totalVotes: 600 }, { totalVotes: 50 }])).toBe(300);
    expect(margin([{ totalVotes: 300 }])).toBeNull();
  });
});

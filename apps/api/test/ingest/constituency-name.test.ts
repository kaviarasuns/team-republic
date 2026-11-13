import { describe, expect, it } from "@effect/vitest";
import { splitReservationSuffix } from "../../src/ingest/constituency-name.ts";

describe("splitReservationSuffix", () => {
  it("splits a (SC) or (ST) suffix off the name", () => {
    expect(splitReservationSuffix("PONNERI (SC)")).toEqual({ name: "PONNERI", reservation: "SC" });
    expect(splitReservationSuffix("GUDALUR (ST)")).toEqual({ name: "GUDALUR", reservation: "ST" });
  });

  it("keeps hyphens and other bracketed words in the name", () => {
    expect(splitReservationSuffix("THIRU-VI-KA-NAGAR (SC)")).toEqual({
      name: "THIRU-VI-KA-NAGAR",
      reservation: "SC",
    });
    expect(splitReservationSuffix("TIRUPPUR (NORTH)")).toEqual({
      name: "TIRUPPUR (NORTH)",
      reservation: null,
    });
  });

  it("returns the name unchanged when there is no suffix", () => {
    expect(splitReservationSuffix("Gummidipoondi")).toEqual({
      name: "Gummidipoondi",
      reservation: null,
    });
    expect(splitReservationSuffix("(SC)")).toEqual({ name: "(SC)", reservation: null });
  });
});

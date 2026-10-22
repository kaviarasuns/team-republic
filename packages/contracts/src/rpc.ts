import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import {
  CandidateId,
  CandidateProfile,
  ConstituencyId,
  ConstituencyList,
  ConstituencyResult,
  ElectionId,
} from "./domain.ts";
import {
  CandidateNotFound,
  ConstituencyNotFound,
  DataUnavailable,
  ElectionNotFound,
} from "./errors.ts";

export class ElectionRpcs extends RpcGroup.make(
  Rpc.make("ListConstituencies", {
    /** Omit electionId to use the latest general election. */
    payload: { electionId: Schema.optional(ElectionId) },
    success: ConstituencyList,
    error: Schema.Union([ElectionNotFound, DataUnavailable]),
  }),
  Rpc.make("GetConstituencyResult", {
    payload: { constituencyId: ConstituencyId },
    success: ConstituencyResult,
    error: ConstituencyNotFound,
  }),
  Rpc.make("GetCandidateProfile", {
    payload: { candidateId: CandidateId },
    success: CandidateProfile,
    error: CandidateNotFound,
  }),
) {}

export const RPC_PATH = "/rpc";

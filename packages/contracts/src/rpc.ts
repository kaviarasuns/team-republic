import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import {
  CandidateId,
  CandidateProfile,
  ConstituencyId,
  ConstituencyList,
  ConstituencyResult,
  ElectionId,
  ElectionList,
  ElectionMap,
} from "./domain.ts";
import {
  CandidateNotFound,
  ConstituencyNotFound,
  DataUnavailable,
  ElectionNotFound,
} from "./errors.ts";

export class ElectionRpcs extends RpcGroup.make(
  /** Elections with stored results, newest year first; empty before any ingest. */
  Rpc.make("ListElections", {
    payload: {},
    success: ElectionList,
  }),
  Rpc.make("ListConstituencies", {
    /** Omit electionId to use the latest general election. */
    payload: { electionId: Schema.optional(ElectionId) },
    success: ConstituencyList,
    error: Schema.Union([ElectionNotFound, DataUnavailable]),
  }),
  /** Every constituency's winner and margin in one election, for the map. */
  Rpc.make("GetElectionMap", {
    /** Omit electionId to use the latest general election. */
    payload: { electionId: Schema.optional(ElectionId) },
    success: ElectionMap,
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

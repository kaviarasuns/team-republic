import type { CandidateId, ConstituencyId, ElectionId } from "@team-republic/contracts";
import { ElectionClient } from "./rpc-client.ts";

/** Every stored election, newest year first. */
export const electionsAtom = ElectionClient.query("ListElections", {});

export const constituenciesAtom = (electionId?: ElectionId) =>
  ElectionClient.query("ListConstituencies", electionId === undefined ? {} : { electionId });

/** Every constituency's winner and margin in one election; omit the id for the latest. */
export const electionMapAtom = (electionId?: ElectionId) =>
  ElectionClient.query("GetElectionMap", electionId === undefined ? {} : { electionId });

export const constituencyResultAtom = (constituencyId: ConstituencyId) =>
  ElectionClient.query("GetConstituencyResult", { constituencyId });

export const candidateProfileAtom = (candidateId: CandidateId) =>
  ElectionClient.query("GetCandidateProfile", { candidateId });

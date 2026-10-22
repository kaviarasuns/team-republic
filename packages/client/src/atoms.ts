import type { CandidateId, ConstituencyId, ElectionId } from "@team-republic/contracts";
import { ElectionClient } from "./rpc-client.ts";

export const constituenciesAtom = (electionId?: ElectionId) =>
  ElectionClient.query("ListConstituencies", electionId === undefined ? {} : { electionId });

export const constituencyResultAtom = (constituencyId: ConstituencyId) =>
  ElectionClient.query("GetConstituencyResult", { constituencyId });

export const candidateProfileAtom = (candidateId: CandidateId) =>
  ElectionClient.query("GetCandidateProfile", { candidateId });

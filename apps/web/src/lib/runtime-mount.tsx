import { useAtomMount } from "@effect/atom-react";
import { ElectionClient } from "@team-republic/client";

/** Keeps the RPC atom runtime alive for the app session. */
export function RuntimeMount() {
  useAtomMount(ElectionClient.runtime);
  return null;
}

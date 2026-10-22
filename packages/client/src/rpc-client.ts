import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { AtomRpc } from "effect/reactivity";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { ElectionRpcs, RPC_PATH } from "@team-republic/contracts";

let apiBaseUrl = "http://localhost:4000";

/** Call once at app start, before any atom is read. */
export const configureApiBaseUrl = (url: string): void => {
  apiBaseUrl = url.replace(/\/$/, "");
};

export class ElectionClient extends AtomRpc.Service<ElectionClient>()("ElectionClient", {
  group: ElectionRpcs,
  protocol: () =>
    RpcClient.layerProtocolHttp({ url: `${apiBaseUrl}${RPC_PATH}` }).pipe(
      Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson]),
    ),
}) {}

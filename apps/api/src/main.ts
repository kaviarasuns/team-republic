import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { ElectionRpcs, RPC_PATH } from "@team-republic/contracts";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { RpcSerialization, RpcServer } from "effect/rpc";
import { createServer } from "node:http";
import { AuthLive } from "./auth/auth.ts";
import { ApiConfig } from "./config.ts";
import { DatabaseLive } from "./db/database.ts";
import { ElectionRepositoryDrizzle } from "./elections/repository-drizzle.ts";
import { ElectionRpcsLive } from "./elections/rpc-handlers.ts";
import { AuthRoutesLive } from "./http/auth-routes.ts";
import { PublicApiLive } from "./http/public-api.ts";
import { OutboxHandlersLive, OutboxWorkerLive } from "./outbox/outbox.ts";
import { TelemetryLive } from "./telemetry.ts";

const RpcRoutes = RpcServer.layerHttp({
  group: ElectionRpcs,
  path: RPC_PATH,
  protocol: "http",
}).pipe(Layer.provide([ElectionRpcsLive, RpcSerialization.layerJson]));

const Routes = Layer.unwrap(
  Effect.gen(function* () {
    const api = yield* ApiConfig;
    return Layer.mergeAll(
      RpcRoutes,
      PublicApiLive,
      AuthRoutesLive,
      HttpRouter.cors({ allowedOrigins: api.corsOrigins, credentials: true }),
    );
  }),
);

const ServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const api = yield* ApiConfig;
    return NodeHttpServer.layer(createServer, { port: api.port });
  }),
);

const AppLive = HttpRouter.serve(Routes).pipe(
  Layer.provide(ServerLive),
  Layer.merge(OutboxWorkerLive.pipe(Layer.provide(OutboxHandlersLive))),
  Layer.provide([ElectionRepositoryDrizzle, AuthLive]),
  Layer.provide(DatabaseLive),
  Layer.provide(TelemetryLive),
);

Layer.launch(AppLive).pipe(NodeRuntime.runMain);

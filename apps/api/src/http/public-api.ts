import { Effect, Layer, Schema } from "effect";
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";

export class SystemGroup extends HttpApiGroup.make("system").add(
  HttpApiEndpoint.get("health", "/health", {
    success: Schema.Struct({ status: Schema.Literal("ok") }),
  }),
) {}

/** Public, documented HTTP routes. Our own apps use Effect RPC instead. */
export class PublicApi extends HttpApi.make("public").add(SystemGroup) {}

const SystemLive = HttpApiBuilder.group(PublicApi, "system", (handlers) =>
  handlers.handle("health", () => Effect.succeed({ status: "ok" as const })),
);

export const PublicApiLive = HttpApiBuilder.layer(PublicApi, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(SystemLive),
);

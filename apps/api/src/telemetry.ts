import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import { TelemetryConfig } from "./config.ts";

/** Exports traces over OTLP/HTTP when OTEL_EXPORTER_OTLP_ENDPOINT is set; otherwise a no-op. */
export const TelemetryLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* TelemetryConfig;
    if (config.otlpEndpoint === "") return Layer.empty;
    return OtlpTracer.layer({
      url: `${config.otlpEndpoint.replace(/\/$/, "")}/v1/traces`,
      resource: { serviceName: config.serviceName },
    }).pipe(Layer.provide([FetchHttpClient.layer, OtlpSerialization.layerJson]));
  }),
);

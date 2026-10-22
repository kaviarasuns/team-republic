import { Config } from "effect";

export const DatabaseUrl = Config.Redacted("DATABASE_URL");

export const ApiConfig = Config.all({
  port: Config.Port("API_PORT").pipe(Config.withDefault(4000)),
  corsOrigins: Config.String("CORS_ORIGINS").pipe(
    Config.withDefault("http://localhost:5173,http://localhost:8081"),
    Config.map((value) => value.split(",").map((origin) => origin.trim())),
  ),
});

export const AuthConfig = Config.all({
  secret: Config.Redacted("BETTER_AUTH_SECRET"),
  baseUrl: Config.String("BETTER_AUTH_URL").pipe(Config.withDefault("http://localhost:4000")),
});

export const ObjectStorageConfig = Config.all({
  /** Empty for AWS S3; set for SeaweedFS or another S3-compatible store. */
  endpoint: Config.String("S3_ENDPOINT").pipe(Config.withDefault("")),
  region: Config.String("S3_REGION").pipe(Config.withDefault("us-east-1")),
  bucket: Config.String("S3_BUCKET"),
  accessKeyId: Config.Redacted("S3_ACCESS_KEY_ID"),
  secretAccessKey: Config.Redacted("S3_SECRET_ACCESS_KEY"),
  forcePathStyle: Config.Boolean("S3_FORCE_PATH_STYLE").pipe(Config.withDefault(false)),
});

export const TelemetryConfig = Config.all({
  otlpEndpoint: Config.String("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(Config.withDefault("")),
  serviceName: Config.String("OTEL_SERVICE_NAME").pipe(Config.withDefault("team-republic-api")),
});

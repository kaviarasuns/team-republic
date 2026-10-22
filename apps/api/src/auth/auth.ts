import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer, Redacted } from "effect";
import pg from "pg";
import { ApiConfig, AuthConfig, DatabaseUrl } from "../config.ts";
import * as schema from "../db/schema.ts";

const makeAuth = Effect.gen(function* () {
  const auth = yield* AuthConfig;
  const api = yield* ApiConfig;
  const url = yield* DatabaseUrl;

  // Better Auth's adapter needs a promise-based Drizzle instance; it shares the schema.
  const pool = yield* Effect.acquireRelease(
    Effect.sync(() => new pg.Pool({ connectionString: Redacted.value(url), max: 5 })),
    (p) => Effect.promise(() => p.end()),
  );
  const db = drizzle({ client: pool });

  return betterAuth({
    secret: Redacted.value(auth.secret),
    baseURL: auth.baseUrl,
    basePath: "/api/auth",
    trustedOrigins: api.corsOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true },
  });
});

export class Auth extends Context.Service<Auth, Effect.Success<typeof makeAuth>>()("Auth") {}

export const AuthLive = Layer.effect(Auth, makeAuth);

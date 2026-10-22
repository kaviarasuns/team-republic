import { NodeRuntime } from "@effect/platform-node";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { Database, DatabaseLive } from "./database.ts";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export const runMigrations = Effect.gen(function* () {
  const db = yield* Database;
  yield* migrate(db, { migrationsFolder });
  yield* Effect.logInfo("Migrations applied", { migrationsFolder });
});

if (import.meta.main) {
  runMigrations.pipe(Effect.provide(DatabaseLive), NodeRuntime.runMain);
}

import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import { DatabaseUrl } from "../config.ts";

const makeDatabase = PgDrizzle.makeWithDefaults();

export class Database extends Context.Service<Database, Effect.Success<typeof makeDatabase>>()(
  "Database",
) {}

export const PgLive = PgClient.layerConfig({ url: DatabaseUrl });

export const DatabaseLive = Layer.effect(Database, makeDatabase).pipe(Layer.provideMerge(PgLive));

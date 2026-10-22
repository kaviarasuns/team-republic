import { Context, Duration, Effect, Layer, Schedule } from "effect";
import { SqlClient } from "effect/sql";

export interface OutboxMessage {
  readonly id: number;
  readonly topic: string;
  readonly payload: unknown;
  readonly attempts: number;
}

export type OutboxHandler = (message: OutboxMessage) => Effect.Effect<void, unknown>;

/** Topic → handler. Messages with no handler stay pending and are logged. */
export class OutboxHandlers extends Context.Service<OutboxHandlers, ReadonlyMap<string, OutboxHandler>>()(
  "OutboxHandlers",
) {}

const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 20;

/** Enqueue inside the caller's transaction so the message commits with the data. */
export const enqueue = (topic: string, payload: unknown) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`insert into outbox (topic, payload) values (${topic}, ${JSON.stringify(payload)}::jsonb)`;
  });

/**
 * Claims one batch with `FOR UPDATE SKIP LOCKED` so several workers can run
 * side by side, then handles each message inside the same transaction.
 */
export const processBatch = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const handlers = yield* OutboxHandlers;

  return yield* sql.withTransaction(
    Effect.gen(function* () {
      const rows = yield* sql<{ id: string; topic: string; payload: unknown; attempts: number }>`
        select id, topic, payload, attempts
        from outbox
        where processed_at is null and available_at <= now() and attempts < ${MAX_ATTEMPTS}
        order by id
        limit ${BATCH_SIZE}
        for update skip locked
      `;
      for (const row of rows) {
        const message: OutboxMessage = { ...row, id: Number(row.id) };
        const handler = handlers.get(row.topic);
        if (handler === undefined) {
          yield* Effect.logWarning("No outbox handler for topic", { topic: row.topic, id: row.id });
          continue;
        }
        yield* handler(message).pipe(
          Effect.matchEffect({
            onSuccess: () => sql`update outbox set processed_at = now() where id = ${row.id}`,
            onFailure: (error) =>
              sql`
                update outbox
                set attempts = attempts + 1,
                    last_error = ${String(error)},
                    available_at = now() + (interval '1 second' * power(2, attempts + 1))
                where id = ${row.id}
              `,
          }),
        );
      }
      return rows.length;
    }),
  );
});

export const OutboxWorkerLive = Layer.effectDiscard(
  processBatch.pipe(
    Effect.catchCause((cause) => Effect.logError("Outbox batch failed", cause).pipe(Effect.as(0))),
    Effect.repeat(Schedule.spaced(Duration.seconds(1))),
    Effect.withSpan("outbox.worker"),
    Effect.forkScoped,
  ),
);

export const OutboxHandlersLive = Layer.succeed(
  OutboxHandlers,
  new Map<string, OutboxHandler>([
    [
      "results.stored",
      (message) => Effect.logInfo("Results stored", { id: message.id, payload: message.payload }),
    ],
  ]),
);

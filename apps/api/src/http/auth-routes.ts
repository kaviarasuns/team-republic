import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { Auth } from "../auth/auth.ts";

/** Mounts Better Auth's fetch handler under `/api/auth/*`. */
export const AuthRoutesLive = Layer.unwrap(
  Effect.gen(function* () {
    const auth = yield* Auth;
    return HttpRouter.add("*", "/api/auth/*", (request) =>
      HttpServerRequest.toWeb(request).pipe(
        Effect.flatMap((webRequest) => Effect.promise(() => auth.handler(webRequest))),
        Effect.map(HttpServerResponse.fromWeb),
      ),
    );
  }),
);

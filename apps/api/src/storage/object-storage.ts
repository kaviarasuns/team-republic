import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Context, Data, Effect, Layer, Redacted } from "effect";
import { ObjectStorageConfig } from "../config.ts";

export class ObjectStorageError extends Data.TaggedError("ObjectStorageError")<{
  readonly operation: string;
  readonly key: string;
  readonly cause: unknown;
}> {}

export interface PutObjectInput {
  readonly key: string;
  readonly body: Uint8Array;
  readonly contentType: string;
  readonly sha256: string;
}

export class ObjectStorage extends Context.Service<
  ObjectStorage,
  {
    readonly bucket: string;
    readonly exists: (key: string) => Effect.Effect<boolean, ObjectStorageError>;
    readonly put: (input: PutObjectInput) => Effect.Effect<void, ObjectStorageError>;
  }
>()("ObjectStorage") {}

const isNotFound = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "$metadata" in error &&
  (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;

export const ObjectStorageLive = Layer.effect(
  ObjectStorage,
  Effect.gen(function* () {
    const config = yield* ObjectStorageConfig;
    const client = new S3Client({
      region: config.region,
      ...(config.endpoint === "" ? {} : { endpoint: config.endpoint }),
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: Redacted.value(config.accessKeyId),
        secretAccessKey: Redacted.value(config.secretAccessKey),
      },
    });
    yield* Effect.addFinalizer(() => Effect.sync(() => client.destroy()));

    const bucket = config.bucket;

    // Local stores start empty; on AWS the bucket is provisioned out of band.
    if (config.endpoint !== "") {
      yield* Effect.tryPromise({
        try: () => client.send(new HeadBucketCommand({ Bucket: bucket })),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch(() =>
          Effect.tryPromise({
            try: () => client.send(new CreateBucketCommand({ Bucket: bucket })),
            catch: (cause) =>
              new ObjectStorageError({ operation: "createBucket", key: bucket, cause }),
          }),
        ),
      );
    }

    const exists = (key: string) =>
      Effect.tryPromise({
        try: () => client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
        catch: (cause) => cause,
      }).pipe(
        Effect.as(true),
        Effect.catch((cause) =>
          isNotFound(cause)
            ? Effect.succeed(false)
            : Effect.fail(new ObjectStorageError({ operation: "head", key, cause })),
        ),
      );

    const put = (input: PutObjectInput) =>
      Effect.tryPromise({
        try: () =>
          client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: input.key,
              Body: input.body,
              ContentType: input.contentType,
              Metadata: { sha256: input.sha256 },
            }),
          ),
        catch: (cause) => new ObjectStorageError({ operation: "put", key: input.key, cause }),
      }).pipe(Effect.asVoid);

    return ObjectStorage.of({ bucket, exists, put });
  }),
);

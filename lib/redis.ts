import { Redis } from "@upstash/redis";

/**
 * The one Upstash client.
 *
 * Server-only. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are
 * read from the environment and never exposed to the client bundle — nothing
 * under `lib/redis.ts` may be imported by a `"use client"` module, or the token
 * becomes a public env var (see `server-only` below).
 *
 * There is exactly one client instance for the whole app, constructed lazily.
 * It is exported as a getter rather than a top-level `const` so that merely
 * importing this module — which route handlers and pages do at module scope — does
 * not throw on a build machine with no credentials. A missing token is a runtime
 * failure for the one route that needs Redis, not a build failure for the site.
 *
 * Named `redis` rather than `client` at the call site: `redis.sadd(...)` reads
 * as the operation it is, and a second `new Redis(...)` anywhere else in the app
 * would mean two connection pools and two sets of credentials.
 */

function create(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. Both are required by the routes that talk to Redis.",
    );
  }

  return new Redis({ url, token });
}

let instance: Redis | null = null;

/** Lazily constructed, then reused for the lifetime of the server process. */
export function getRedis(): Redis {
  instance ??= create();
  return instance;
}

/** True when credentials are present. Lets a page render an honest state. */
export function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

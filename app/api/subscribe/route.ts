import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

/**
 * Newsletter capture — DESIGN.md sections 8.5, 15a.
 *
 * Writes to Redis and nothing else. There is no confirmation email, no double
 * opt-in, and no send, and that is deliberate rather than unfinished: daily sends
 * are deferred until there is a content cadence worth mailing, and a half-built
 * confirmation flow is worse than none. The set accumulates expressed interest
 * so that adding a send later needs no migration of what we already have.
 *
 * The Set is the whole dedupe story. `SADD` is idempotent, so subscribing twice
 * is indistinguishable from subscribing once — and the response is the same
 * either way, because "you are already subscribed" tells a stranger whether an
 * address is on a list. That is a small information leak for no product gain, so
 * the endpoint never distinguishes the two cases and the form always shows the
 * same success line.
 *
 * Rate limited per IP with a sliding window, because the endpoint is unauthenticated
 * and writes to shared state: without it, one script can fill the set with junk
 * addresses and the first real send goes to all of them.
 */

/** Keys live under `p99:` like the localStorage namespace (lib/attempts.ts). */
const SUBSCRIBERS_KEY = "p99:subscribers";

/**
 * Five attempts a minute is generous for a human typing one address.
 *
 * Built lazily rather than at module scope: the constructor captures the Redis
 * client, and a module-scope construction would run during `next build` on a
 * machine with no credentials, failing the whole build for a route that is
 * perfectly fine to leave uninstantiated until it is actually called.
 */
let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit {
  limiter ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "p99:ratelimit:subscribe",
    // A distinct analytics key would need its own env var; the limiter's own
    // counter is the signal we act on, so analytics is off rather than invented.
    analytics: false,
  });
  return limiter;
}

/**
 * Deliberately loose. The job is to catch typos and obvious garbage, not to
 * adjudicate RFC 5322 — a strict regex rejects valid addresses, and this address
 * is never sent anywhere in this pass, so a false rejection costs a real reader.
 * Anchored, single-line, and bounded in length.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const MAX_LENGTH = 254; // the SMTP maximum, and the length at which a set member stops being a string

function clientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for as `client, proxy1, proxy2…`; the leftmost entry
  // is the original client. Falls back to a constant so an unset header cannot
  // be used to give every request a fresh, empty rate-limit bucket.
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null
      ? (body as { email?: unknown }).email
      : undefined;

  if (typeof email !== "string" || email.length > MAX_LENGTH || !EMAIL.test(email.trim())) {
    return NextResponse.json(
      { error: "That does not look like an email address." },
      { status: 400 },
    );
  }

  const { success, reset } = await getLimiter().limit(clientIp(request));
  if (!success) {
    // 429 plus Retry-After, which is what the email client's `type="email"`
    // autofill and any retry logic actually read. Seconds, rounded up, minimum 1.
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    await getRedis().sadd(SUBSCRIBERS_KEY, email.trim().toLowerCase());
  } catch (error) {
    // Never echo the Redis error: it can carry the endpoint URL and token. The
    // reader gets a generic failure and the server logs the detail.
    console.error("subscribe: SADD failed", { error: String(error) });
    return NextResponse.json(
      { error: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }

  // Identical for a new address and a returning one, on purpose.
  return NextResponse.json({ ok: true });
}

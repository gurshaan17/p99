import { createHmac, timingSafeEqual } from "node:crypto";
import { ORIGIN } from "@/lib/origin";

/**
 * Signed unsubscribe tokens.
 *
 * The unsubscribe endpoint removes an address from the list, so the link
 * cannot take the address as a bare query param — `/api/unsubscribe?email=
 * victim@example.com` would let anyone remove anyone else one GET at a time.
 * The link carries an HMAC of the address under a server secret instead, and
 * the route re-derives it: a valid token proves the link was minted here.
 *
 * The key is UNSUBSCRIBE_SECRET, not CRON_SECRET. Different rotation
 * schedules: rotating the cron secret should not invalidate every
 * unsubscribe link already sitting in old inboxes.
 *
 * Email addresses are lowercased before signing because that is how they
 * enter the set — one canonical form, or the same address would produce two
 * tokens and splitting verification by case is a bug waiting to be written.
 */

const PURPOSE = "p99:unsubscribe:v1";

function secret(): string {
  const value = process.env.UNSUBSCRIBE_SECRET;
  if (!value) {
    throw new Error(
      "Missing UNSUBSCRIBE_SECRET. Generate one with `openssl rand -hex 32`.",
    );
  }
  return value;
}

function sign(email: string): string {
  return createHmac("sha256", secret())
    .update(`${PURPOSE}:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function unsubscribeToken(email: string): string {
  return sign(email);
}

/** Constant-time comparison — a timing oracle here would be a forgery oracle. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(sign(email), "hex");
  const given = Buffer.from(token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The per-recipient link used in the footer, the List-Unsubscribe header, and mailto. */
export function unsubscribeUrl(email: string): string {
  const normalized = email.trim().toLowerCase();
  const params = new URLSearchParams({
    email: normalized,
    token: unsubscribeToken(normalized),
  });
  return `${ORIGIN}/api/unsubscribe?${params.toString()}`;
}

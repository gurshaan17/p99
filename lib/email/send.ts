import { SendRawEmailCommand } from "@aws-sdk/client-ses";
import { getSes } from "@/lib/ses";
import { ORIGIN } from "@/lib/origin";
import type { Incident } from "@/lib/incidents";
import { renderDailyDigest, type RenderedEmail } from "./daily-digest";

/**
 * The send path for P99 email.
 *
 * Why `SendRawEmail` and not `SendEmail`: the standard API accepts only
 * Source/Destination/Subject/Body, and the List-Unsubscribe headers that
 * Gmail/Yahoo now require of bulk senders are not among them. Raw MIME is the
 * only way to set headers, at the cost of constructing the message ourselves.
 *
 * One send per recipient: each address gets its own message with only their
 * address in the `To:` header, so no reader can see the rest of the list.
 * At P99's scale (tens to low hundreds daily) the per-call overhead is
 * trivially fine for SES, and it keeps a reject on one address from taking
 * down anyone else.
 *
 * Send failures are reported, not thrown: one rejected address must not
 * discard the sends that went through. The caller decides whether a partial
 * result is a failure — the cron job wants the full report, not an exception
 * mid-loop.
 */
export interface SendFailure {
  recipient: string;
  error: string;
}

export interface SendReport {
  /** Addresses SES accepted. */
  succeeded: string[];
  /** Addresses that failed, with the reason. */
  failed: SendFailure[];
}

/** RFC 2047 encoded-word for subjects: titles contain `—` and `→`. */
function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function buildMime(
  from: string,
  recipient: string,
  rendered: RenderedEmail,
): Buffer {
  const boundary = `p99-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  // The unsubscribe target this message references: header form sends
  // everything below, and the HTTPS form must satisfy one-click unsubscribe
  // for the `List-Unsubscribe-Post` header to be meaningful rather than a
  // hint.
  const unsubscribeUrl = `${ORIGIN}/unsubscribe`;
  const mailto = `mailto:${from}?subject=${encodeURIComponent("Unsubscribe")}`;

  const message = [
    `From: ${from}`,
    `To: ${recipient}`,
    `Subject: ${encodeSubject(rendered.subject)}`,
    "MIME-Version: 1.0",
    `List-Unsubscribe: <${mailto}>, <${unsubscribeUrl}>`,
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    rendered.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    rendered.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(message, "utf-8");
}

/** One raw-MIME send per recipient, in parallel. */
export async function sendRendered(
  toEmails: string[],
  rendered: RenderedEmail,
): Promise<SendReport> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) {
    throw new Error("Missing SES_FROM_EMAIL. Required as the From header.");
  }

  const results = await Promise.all(
    toEmails.map(async (recipient): Promise<string | SendFailure> => {
      try {
        await getSes().send(
          new SendRawEmailCommand({
            Source: from,
            Destinations: [recipient],
            RawMessage: { Data: buildMime(from, recipient, rendered) },
          }),
        );
        return recipient;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("ses: send failed", { error: message, recipient });
        return { recipient, error: message };
      }
    }),
  );

  const succeeded: string[] = [];
  const failed: SendFailure[] = [];
  for (const result of results) {
    if (typeof result === "string") succeeded.push(result);
    else failed.push(result);
  }
  return { succeeded, failed };
}

export function sendDailyDigest(
  toEmails: string[],
  incident: Incident,
): Promise<SendReport> {
  return sendRendered(toEmails, renderDailyDigest(incident));
}

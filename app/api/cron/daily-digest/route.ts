import { getRedis } from "@/lib/redis";
import {
  publishDayKey,
  publishedIncidents,
} from "@/lib/incidents";
import { hasSes } from "@/lib/ses";
import { sendDailyDigest } from "@/lib/email/send";

/**
 * The daily digest cron — DESIGN.md section 8.6 for the publishing clock.
 *
 * Fires at 04:00 UTC, which is 09:30 IST: after the 02:00 IST publish
 * instant (20:30 UTC the evening before, see `vercel.json`) has flipped the
 * incident live, and late enough that the reader's morning inbox is
 * reasonable even though the post itself has been up since 2 AM.
 *
 * Auth matches `app/api/revalidate/route.ts` exactly: Vercel sends
 * `Authorization: Bearer $CRON_SECRET`, and an unset secret fails closed to
 * the `VERCEL=1` marker rather than opening the endpoint.
 */

const SUBSCRIBERS_KEY = "p99:subscribers";

/**
 * Per-day send marker. The cron is an at-least-once caller: a retried or
 * manually re-triggered run would otherwise mail the same incident twice.
 * The key says the send for one publish day happened, so a second invocation
 * that day skips instead of duplicating.
 */
function dailyKey(day: string): string {
  return `p99:digest:sent:${day}`;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL === "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasSes()) {
    return Response.json(
      { sent: 0, skipped: "SES credentials not configured" },
      { status: 503 },
    );
  }

  // Today's incident means one published *on today's publish day* — not the
  // newest published incident overall, which on a content gap would be
  // yesterday's, and re-mailing yesterday's post would read as a resend bug.
  const incident = publishedIncidents().find(
    (i) => i.publishedAt === publishDayKey(),
  );
  if (!incident) {
    console.log("daily-digest: no incident published today, skipping send");
    return Response.json({
      sent: 0,
      skipped: `No incident published on ${publishDayKey()}`,
    });
  }

  let subscribers: string[];
  try {
    const sentKey = dailyKey(publishDayKey());
    if (await getRedis().get(sentKey)) {
      console.log("daily-digest: already sent today, skipping duplicate run");
      return Response.json({ sent: 0, skipped: `Already sent for ${publishDayKey()}` });
    }

    subscribers = await getRedis().smembers(SUBSCRIBERS_KEY);
  } catch (error) {
    console.error("daily-digest: Redis failed", { error: String(error) });
    return Response.json({ error: "Could not load subscribers." }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json({ sent: 0, failed: 0, slug: incident.slug });
  }

  const report = await sendDailyDigest(subscribers, incident);
  console.log("daily-digest: send complete", {
    slug: incident.slug,
    sent: report.succeeded.length,
    failed: report.failed.length,
  });

  // Set the marker only when at least one send succeeded — a total failure
  // should be retryable, not remembered as done. 48h TTL so the keyspace
  // does not grow forever.
  if (report.succeeded.length > 0) {
    try {
      await getRedis().set(dailyKey(publishDayKey()), "1", { ex: 48 * 60 * 60 });
    } catch (error) {
      console.error("daily-digest: failed to record send marker", { error: String(error) });
    }
  }

  return Response.json({
    slug: incident.slug,
    sent: report.succeeded.length,
    failed: report.failed.length,
    errors: report.failed.map((f) => f.error),
  });
}

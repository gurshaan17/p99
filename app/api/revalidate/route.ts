import { revalidatePath } from "next/cache";
import { PUBLISH_CRON, publishedIncidents } from "@/lib/incidents";

/**
 * Scheduled publishing — DESIGN.md section 8.6.
 *
 * Vercel calls this once a day at `PUBLISH_CRON`, the same instant
 * `isPublished` treats as the start of a publishing day, and the whole site is
 * marked stale. Every page under the root layout is re-rendered on its next
 * request against the new clock, so the day's incident appears on the home page,
 * the archive, `/topics`, `/streak` and its own `/q/[slug]` route without a
 * deploy — and the pages that were already live are unchanged, because the
 * content did not change.
 *
 * `("/", "layout")` rather than a list of paths. Revalidating the layout
 * invalidates it, every nested layout, and every page beneath it, which is the
 * only call here that cannot leave one surface behind: enumerating routes would
 * mean adding a line every time a page is added, and the failure mode of forgetting
 * is a stale page that looks fine forever.
 *
 * Dynamic, because reading the header is a request-time API and a cached route
 * handler would answer the cron from the cache instead of revalidating anything.
 */
export const dynamic = "force-dynamic";

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set on
 * the project, and nothing at all when it is not — so an unset secret means this
 * endpoint is unauthenticated, and that has to fail closed rather than open.
 * `VERCEL` is the marker Vercel sets on its own infrastructure; a request
 * carrying it came from the cron, whatever the secret situation is.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL === "1";

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  revalidatePath("/", "layout");

  return Response.json({
    revalidated: true,
    // What the site will show once the invalidated pages are next requested. The
    // cron is the only caller that needs to know whether it fired on time, and
    // this is that answer — a 200 from a job that ran a day late is otherwise
    // indistinguishable from one that ran on schedule.
    published: publishedIncidents().length,
    schedule: PUBLISH_CRON,
    at: new Date().toISOString(),
  });
}
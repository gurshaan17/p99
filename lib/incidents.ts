import {
  incidents,
  TOPICS,
  type Incident,
  type Topic,
} from "@/content/incidents";

export type { Incident, Topic };
export { incidents, TOPICS };

export type Difficulty = Incident["difficulty"];
export type RubricDim = Incident["rubric"][number]["dim"];

export const DIFFICULTIES: readonly Difficulty[] = [
  "easy",
  "medium",
  "hard",
];

export const bySlug = new Map(incidents.map((i) => [i.slug, i]));

/**
 * The published view of one slug, or nothing.
 *
 * Scheduled incidents are absent rather than marked: an unpublished slug and a
 * slug that does not exist have to be indistinguishable from outside, or the
 * archive becomes a preview of what is coming. This is the filter the incident
 * page and its metadata share, which is what makes the 404 fall out of one check
 * rather than two that can disagree.
 *
 * `bySlug` remains the unfiltered lookup, and nothing that renders reads it —
 * which is the point of it existing separately. The publishing route needs to
 * report counts, not articles; if it wanted articles it would be leaking.
 */
export function getIncident(slug: string): Incident | undefined {
  const incident = bySlug.get(slug);
  return incident && isPublished(incident) ? incident : undefined;
}

/**
 * When the day's post goes out — DESIGN.md section 8.6.
 *
 * One instant a day, and everything about publication is derived from it:
 * `isPublished`, the streak grid's day boundaries, and the Vercel cron in
 * `vercel.json` that revalidates the site at the same minute. It was previously
 * "midnight wherever the server happened to be", which made the flip happen at a
 * different wall-clock moment for every reader, at an hour nobody was awake for,
 * and left a cron with nothing to align to.
 *
 * The instant is stated in the site's own timezone — IST — rather than in UTC,
 * because that is the frame the dates in `publishedAt` are written in and the
 * frame the reader keeps their own dates in. IST is UTC+05:30 with no DST, ever,
 * which is why this can be done with arithmetic instead of a timezone database;
 * a site whose readers spanned zones with DST would have to keep the local
 * hour and re-derive the UTC minute at every deployment instead of pinning one.
 */
const PUBLISH_TZ_OFFSET_MINUTES = 330;

/** 02:00 in the site's timezone. The one moment of the day a post goes live. */
const PUBLISH_LOCAL_MINUTE_OF_DAY = 2 * 60;

/**
 * The same instant in UTC, which is the only form a cron schedule can use.
 *
 * 02:00 IST is 20:30 UTC *on the previous calendar day*, which is why the cron in
 * `vercel.json` fires in the evening rather than after midnight. Exported because
 * the revalidation route reports it and a reader debugging a stuck page needs to
 * see the instant it is actually waiting for.
 */
export const PUBLISH_MINUTE_OF_DAY_UTC =
  (PUBLISH_LOCAL_MINUTE_OF_DAY - PUBLISH_TZ_OFFSET_MINUTES + 1440) % 1440;

/**
 * The same schedule in the form `vercel.json` wants.
 *
 * Duplicated rather than imported because `vercel.json` is read by Vercel before
 * any of this runs. It is a build-time cron schedule, not a runtime one, so
 * nothing can check that the two agree — keep them in step by hand.
 */
export const PUBLISH_CRON = "30 20 * * *";

/**
 * The publish day containing `now`, as a `YYYY-MM-DD` key.
 *
 * A post dated D goes live at 02:00 IST on D, so the whole day's content hangs off
 * one roll-over. The implementation shifts `now` into the site's timezone and, if
 * the local clock has not reached the publish minute yet, steps back a day —
 * which is the whole thing, and is immune to both things that make date
 * arithmetic wrong elsewhere in this file's history: the server's own timezone
 * (Vercel runs in UTC, a laptop does not) and DST (IST has none).
 *
 * Comparing the local minute against the publish minute rather than shifting the
 * clock by a fixed UTC amount is what keeps this correct at both ends of the day.
 * At 02:00 IST the UTC date is still the day before, so a version that just read
 * the UTC date after shifting would report yesterday's key for the first twenty
 * and a half hours of every day.
 *
 * Being a pure function of a single instant also means it returns the same
 * answer in the browser and on the server, which is what lets a client component
 * filter the registry itself without waiting to be told what is live.
 */
export function publishDayKey(now = new Date()): string {
  const local = new Date(now.getTime() + PUBLISH_TZ_OFFSET_MINUTES * 60_000);
  const minuteOfDay = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (minuteOfDay < PUBLISH_LOCAL_MINUTE_OF_DAY) {
    local.setUTCDate(local.getUTCDate() - 1);
  }
  return local.toISOString().slice(0, 10);
}

/**
 * Whether an incident is public yet.
 *
 * An incident goes out at 02:00 in the site's timezone on its `publishedAt` day
 * and not one second earlier — see `publishDayKey`. Both sides of the comparison
 * are `YYYY-MM-DD` strings rather than `Date`s, which avoids the
 * `new Date("YYYY-MM-DD")` UTC-parsing trap that would read as the previous day
 * for anyone west of Greenwich.
 *
 * The build is still a snapshot: a page prerendered this afternoon cannot
 * re-evaluate itself at 02:00 tomorrow. That is what the cron in `vercel.json` is
 * for — it revalidates the site at the publish instant — and the hourly
 * `revalidate` on each incident page is the net under it, so a missed cron costs
 * an hour rather than a day.
 */
export function isPublished(incident: Incident, now = new Date()): boolean {
  return incident.publishedAt <= publishDayKey(now);
}

/**
 * The public set, newest first. `incidents` is already sorted by `publishedAt`.
 *
 * The only list a rendering surface may read. Every other list in this module —
 * `topicCounts`, `tagCounts`, `incidentsByTopic`, `incidentsByTag`,
 * `totalIncidents` — is derived from this one, so a scheduled incident cannot
 * reach a page through a count, a sidebar or a filter chip even though it is
 * sitting in the registry the whole time.
 *
 * The clock is read per call rather than snapshotted at module scope, on purpose.
 * A module-scope `now` would be correct for a prerendered page and wrong for a
 * warm function: `/rss.xml` and `/llms.txt` run on every request, and a lambda
 * kept alive between two cron hits would keep answering with the publish day it
 * booted on. The price is that two calls microseconds apart across the instant
 * can disagree, which is the cheaper of the two.
 */
export function publishedIncidents(now = new Date()): Incident[] {
  return incidents.filter((incident) => isPublished(incident, now));
}

/**
 * The featured incident for Today — the most recently published one.
 *
 * Until the first incident of a day has gone out at the publish minute, this is
 * yesterday's post, which is the right thing to feature rather than an empty
 * page: the site is one post a day, and a gap in the schedule should read as "not
 * yet" rather than as a hole in the front page.
 */
export const todaysIncident = publishedIncidents()[0] ?? incidents[0];

export function recentIncidents(count: number): Incident[] {
  return publishedIncidents()
    .filter((i) => i.slug !== todaysIncident.slug)
    .slice(0, count);
}

/**
 * The sidebar's section list — one row per topic, in `TOPICS` order.
 *
 * Curated, not derived: `topicCounts` reads these off the content but the
 * *order* and the empty-state suppression come from `TOPICS`, so an area with no
 * incidents yet does not render a heading over nothing.
 *
 * A topic is a partition, not a cross-index — every incident appears under
 * exactly one, so the counts here sum to the incident total. Counted over the
 * published set: a topic whose only incident is scheduled has no shelf yet, and
 * the sidebar is not where tomorrow's post should first become visible.
 */
export const topicCounts = TOPICS.map((t) => ({
  ...t,
  count: publishedIncidents().filter((i) => i.topic === t.id).length,
})).filter((t) => t.count > 0);

/**
 * Every tag in use, ordered by how many incidents carry it, then alphabetically.
 * Derived from content rather than hand-listed, so a new incident's tags show up
 * without editing anything else.
 *
 * Tags are a filter axis, not a navigation axis. They are deliberately not the
 * section list: `postgres` alone would collect every incident, and a section per
 * tag gives a dozen shelves holding one incident each.
 *
 * Published set again, because the archive's filter row is built from this list:
 * a chip for a tag that exists only on an unpublished incident is a filter that
 * returns nothing, which reads as a broken page rather than as a scheduled post.
 */
export const tagCounts = (() => {
  const counts = new Map<string, number>();
  for (const incident of publishedIncidents()) {
    for (const tag of incident.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
})();

export const tags = tagCounts.map((t) => t.tag);

export function incidentsByTag(tag: string): Incident[] {
  return publishedIncidents().filter((i) => i.tags.includes(tag));
}

export function incidentsByTopic(topic: Topic): Incident[] {
  return publishedIncidents().filter((i) => i.topic === topic);
}

export function topicMeta(topic: Topic) {
  return TOPICS.find((t) => t.id === topic)!;
}

/** Published incidents only — a scheduled one has not earned a cell yet. */
export const totalIncidents = publishedIncidents().length;

/**
 * Streak grid — DESIGN.md section 8.3.
 *
 * A real calendar: one column per week, seven rows, Monday to Sunday, oldest
 * week first. The previous version anchored its rows to whatever weekday the
 * newest incident happened to fall on, so the grid was not a calendar at all, and
 * five consecutive days rendered as a diagonal staircase — no two filled cells
 * shared a column, which is the opposite of what a run should look like.
 *
 * The window is the site's real history, from the week containing the first
 * published incident to the week containing today, capped at a year. It was a
 * fixed twelve weeks, which on a site five days old put 73 of 84 cells in the
 * "missed" tone and had the page arguing against its own "one incident a day"
 * premise. The cap exists only so a long-lived site does not render an
 * unreadable grid; before a year those old weeks are not there to lose.
 *
 * `none` covers both ends of the window on purpose: days before the site
 * existed and days that have not happened yet are both absence of a failure,
 * not a broken promise. They used to share the "missed" tone with real gaps,
 * which is what made a five-day-old site look delinquent.
 *
 * Day boundaries are *publish* days, from `publishDayKey` — the same one
 * `isPublished` uses, so a cell can never be `done` for a post that has not gone
 * out yet, and "today" is the day whose post is scheduled rather than the day the
 * server happens to think it is. Two versions ago this used local dates while
 * `isPublished` used the server's local date too, and the two could disagree by a
 * day at midnight; the earlier one used UTC here and local there, which is the
 * same bug wearing a different hat.
 *
 * That leaves the grid disagreeing with the reader's own record on `/streak`,
 * which counts local days on purpose: one of those is the site's history and the
 * other is a question about the reader's clock, and no single answer is right for
 * both. Section 8.3 says so rather than papering over it.
 *
 * This reads the wall clock, so its output does change over time — that is the
 * whole point of a streak. Without it a run never visibly breaks, because a day
 * that published nothing has to be *rendered* as missed rather than omitted. The
 * old code avoided the clock deliberately, to keep a prerendered page from
 * depending on when it was built; the page now opts into revalidation instead,
 * which buys correctness at the cost of up to an hour of staleness.
 */

/** Monday is 0, Sunday is 6. */
const DAY_MS = 86_400_000;

/** A year of weeks. Older history scrolls off the left. */
const MAX_WEEKS = 52;

/**
 * `done`   — an incident published that day.
 * `missed` — the site was live that day and published nothing.
 * `none`   — before the first incident, or later than today.
 */
export type StreakTone = "done" | "missed" | "none";

/** UTC midnight for a publish-day key, `YYYY-MM-DD`. */
function atMidnight(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Calendar-day arithmetic in UTC, not milliseconds: a day here is the site's
 * publishing day, and adding 86,400,000ms to a UTC instant is only the same thing
 * because UTC has no DST to disagree with.
 */
function shiftDays(date: Date, by: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + by);
  return next;
}

const streak = (() => {
  // Every published incident's own day, which is a publish-day key by
  // construction — so a cell cannot be `done` for a post that has not gone out.
  const published = new Set(
    publishedIncidents().map((i) => i.publishedAt),
  );

  if (published.size === 0) {
    return { grid: [], weeks: 0, from: "", to: "", days: 0 };
  }

  const [oldestKey] = [...published].sort();
  const firstDay = atMidnight(oldestKey);
  // Publish day, not calendar day: before the publish minute the current day's
  // post has not gone out yet, and its cell belongs to tomorrow.
  const to = publishDayKey();
  const today = atMidnight(to);

  const mondayOf = (date: Date) => shiftDays(date, -((date.getUTCDay() + 6) % 7));
  const start = mondayOf(firstDay);
  const lastWeek = mondayOf(today);

  const spanned =
    Math.round((lastWeek.getTime() - start.getTime()) / (7 * DAY_MS)) + 1;
  const weeks = Math.min(MAX_WEEKS, spanned);
  const firstCell = shiftDays(start, Math.max(0, spanned - weeks) * 7);

  const grid = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: weeks }, (_, week) => {
      const date = shiftDays(firstCell, week * 7 + day);
      if (date < firstDay || date > today) return "none";
      return published.has(date.toISOString().slice(0, 10)) ? "done" : "missed";
    }),
  );

  return {
    grid,
    weeks,
    from: firstCell.toISOString().slice(0, 10),
    to,
    days: published.size,
  };
})();

export const streakGrid: StreakTone[][] = streak.grid;

/** Columns in the grid. Grows with the site's history, up to a year. */
export const streakWeeks = streak.weeks;

/** First and last day the grid actually draws, for labelling the window. */
export const streakFrom = streak.from;
export const streakTo = streak.to;

export const diagnosedDays = streak.days;

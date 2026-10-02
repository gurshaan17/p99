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

export function getIncident(slug: string): Incident | undefined {
  return bySlug.get(slug);
}

/**
 * Whether an incident is public yet.
 *
 * `publishedAt` is a date, not a timestamp, so an incident scheduled for today
 * is publishable from midnight local time. The build is a snapshot, though: a
 * page prerendered at 09:00 cannot re-evaluate itself at midnight, so anything
 * consuming this needs a dynamic render or a rebuild to pick up the flip. That is
 * the right way round for a feed that is fetched on a schedule, and the wrong way
 * round for a page that should change on its own — which is why the static
 * surfaces below read `incidents` directly rather than going through this.
 */
export function isPublished(incident: Incident, now = new Date()): boolean {
  // Comparing date strings avoids the `new Date("YYYY-MM-DD")` UTC-parsing trap
  // that would read as the previous day for anyone west of Greenwich.
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return incident.publishedAt <= today;
}

/** The public set, newest first. `incidents` is already sorted by `publishedAt`. */
export function publishedIncidents(now = new Date()): Incident[] {
  return incidents.filter((incident) => isPublished(incident, now));
}

/**
 * The featured incident for Today — the most recently published one.
 *
 * Filtered, unlike `recentIncidents`: a scheduled incident sorts to the front of
 * `incidents` while its date is still in the future, and featuring it here would
 * publish tomorrow's post on the home page today. `recentIncidents` is sliced off
 * the same filtered list, so the featured slot and the recents agree.
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
 * exactly one, so the counts here sum to the incident total.
 */
export const topicCounts = TOPICS.map((t) => ({
  ...t,
  count: incidents.filter((i) => i.topic === t.id).length,
})).filter((t) => t.count > 0);

/**
 * Every tag in use, ordered by how many incidents carry it, then alphabetically.
 * Derived from content rather than hand-listed, so a new incident's tags show up
 * without editing anything else.
 *
 * Tags are a filter axis, not a navigation axis. They are deliberately not the
 * section list: `postgres` alone would collect every incident, and a section per
 * tag gives a dozen shelves holding one incident each.
 */
export const tagCounts = (() => {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
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
  return incidents.filter((i) => i.tags.includes(tag));
}

export function incidentsByTopic(topic: Topic): Incident[] {
  return incidents.filter((i) => i.topic === topic);
}

export function topicMeta(topic: Topic) {
  return TOPICS.find((t) => t.id === topic)!;
}

export const totalIncidents = incidents.length;

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
 * Day boundaries are local, like `isPublished` and the reader's record, so a day
 * means the same day throughout this module. The previous version used UTC here
 * and local dates in `isPublished`, which could disagree by one day at midnight.
 *
 * This reads the wall clock, so its output does change over time — that is the
 * whole point of a streak. Without it a run never visibly breaks, because a day
 * that published nothing has to be *rendered* as missed rather than omitted. The
 * old code avoided the clock deliberately, to keep a prerendered page from
 * depending on when it was built; `/streak` now opts into daily revalidation
 * instead, which buys correctness at the cost of up to a day's staleness.
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

/** Local-calendar day key, `YYYY-MM-DD`. */
function localDayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Local midnight for a `YYYY-MM-DD` key. */
function atMidnight(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Calendar-day arithmetic, not milliseconds, so DST cannot slip a day. */
function shiftDays(date: Date, by: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + by);
  return next;
}

const streak = (() => {
  // Filtered, unlike `todaysIncident`: a scheduled incident must not draw as
  // diagnosed before its day.
  const published = new Set(
    incidents.filter((i) => isPublished(i)).map((i) => i.publishedAt),
  );

  if (published.size === 0) {
    return { grid: [], weeks: 0, from: "", to: "", days: 0 };
  }

  const [oldestKey] = [...published].sort();
  const firstDay = atMidnight(oldestKey);
  const to = localDayKey(new Date());
  const today = atMidnight(to);

  const mondayOf = (date: Date) => shiftDays(date, -((date.getDay() + 6) % 7));
  const start = mondayOf(firstDay);
  const lastWeek = mondayOf(today);

  // Rounded, because local midnights either side of a DST change are 7*24h ± 1h
  // apart rather than exactly a week.
  const spanned =
    Math.round((lastWeek.getTime() - start.getTime()) / (7 * DAY_MS)) + 1;
  const weeks = Math.min(MAX_WEEKS, spanned);
  const firstCell = shiftDays(start, Math.max(0, spanned - weeks) * 7);

  const grid = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: weeks }, (_, week) => {
      const date = shiftDays(firstCell, week * 7 + day);
      if (date < firstDay || date > today) return "none";
      return published.has(localDayKey(date)) ? "done" : "missed";
    }),
  );

  return {
    grid,
    weeks,
    from: localDayKey(firstCell),
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

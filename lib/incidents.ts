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

/** The featured incident for Today — the most recently published one. */
export const todaysIncident = incidents[0];

export function recentIncidents(count: number): Incident[] {
  return incidents.filter((i) => i.slug !== todaysIncident.slug).slice(0, count);
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
 * Streak grid — one column per week, seven rows, anchored to the most recent
 * published incident rather than the wall clock, so a prerendered page does not
 * change its own output depending on when it was built.
 *
 * A day counts only if an incident was actually published on it. The old model
 * had a `done` flag and a hand-tuned synthetic grid; the new schema dropped
 * `done`, and inventing a value here would have been worse than deriving one.
 */
export const streakWeeks = 12;
export type StreakTone = "done" | "missed" | "empty";

export const streakGrid: StreakTone[][] = (() => {
  const published = new Set(incidents.map((i) => i.publishedAt));
  const anchor = new Date(`${incidents[0].publishedAt}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: streakWeeks }, (__, week) => {
      const date = new Date(anchor);
      date.setUTCDate(date.getUTCDate() - (streakWeeks - 1 - week) * 7 + day);
      if (date > anchor) return "empty";
      return published.has(date.toISOString().slice(0, 10)) ? "done" : "missed";
    }),
  );
})();

export const diagnosedDays = new Set(incidents.map((i) => i.publishedAt)).size;

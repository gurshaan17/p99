import { incidents, type Incident } from "@/content/incidents";

export type { Incident };
export { incidents };

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

/** The featured incident for Today — the most recently published one. */
export const todaysIncident = incidents[0];

export function recentIncidents(count: number): Incident[] {
  return incidents.filter((i) => i.slug !== todaysIncident.slug).slice(0, count);
}

/**
 * Every tag in use, ordered by how many incidents carry it, then alphabetically.
 * Derived from content rather than hand-listed, so a new incident's tags show up
 * without editing anything else.
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

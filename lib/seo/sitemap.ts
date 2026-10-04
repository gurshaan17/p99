/**
 * Sitemap data — the *list* of URLs, separate from the Next.js convention
 * that renders it. Page generation and sitemap generation are different
 * concerns: the sitemap can grow to 50k+ eligible URLs while only a fraction
 * of them ever prerender, and nothing here builds a page to prove it.
 *
 * Only pages that pass the eligibility gate are included. A `noindex` URL in
 * a sitemap is a contradictory signal — it asks to be crawled and crawled
 * less — so eligibility is enforced here, in one place, not per route.
 *
 * Ordering is deterministic (newest first, then slug) so diffs of the
 * generated XML are meaningful.
 */

import { TOPICS, incidentsByTopic, publishedIncidents } from "@/lib/incidents";
import { ORIGIN } from "@/lib/origin";
import { getIncidentEligibility, getTopicEligibility } from "./eligibility";

export interface SitemapEntry {
  loc: string;
  lastModified: string;
  changeFrequency?: "daily" | "weekly" | "monthly";
  priority?: number;
}

/** One sitemap holds at most 50k URLs (the protocol limit); we chunk smaller. */
export const SITEMAP_CHUNK_SIZE = 5_000;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: SitemapEntry["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/archive", priority: 0.8, changeFrequency: "daily" },
  { path: "/topics", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" },
  { path: "/streak", priority: 0.3, changeFrequency: "weekly" },
  { path: "/submit", priority: 0.3, changeFrequency: "monthly" },
];

export function staticSitemapEntries(): SitemapEntry[] {
  // lastModified for rolling pages is the newest incident's date, not "now":
  // it changes exactly when the content changes, not when the cron happened
  // to rebuild.
  const latest = publishedIncidents()[0]?.publishedAt ?? new Date().toISOString().slice(0, 10);
  return STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    loc: `${ORIGIN}${path}`,
    lastModified: latest,
    changeFrequency,
    priority,
  }));
}

export function topicSitemapEntries(): SitemapEntry[] {
  return TOPICS.filter((topic) => getTopicEligibility(topic.id).indexable).map((topic) => ({
    loc: `${ORIGIN}${`/topics/${topic.id}`}`,
    lastModified:
      incidentsByTopic(topic.id)[0]?.publishedAt ?? new Date().toISOString().slice(0, 10),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}

export function incidentSitemapEntries(): SitemapEntry[] {
  return publishedIncidents()
    .filter((incident) => getIncidentEligibility(incident).indexable)
    .map((incident) => ({
      loc: `${ORIGIN}/q/${incident.slug}`,
      lastModified: incident.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
}

/**
 * The named segments, in sitemap-index order. `incidentChunks` is why this
 * scales: 40k incidents is eight sitemap files, and the sitemap index grows
 * by eight entries — not by 40k lines in one document.
 */
export function sitemapSegments() {
  const incidents = incidentSitemapEntries();
  const chunks: SitemapEntry[][] = [];
  for (let i = 0; i < incidents.length; i += SITEMAP_CHUNK_SIZE) {
    chunks.push(incidents.slice(i, i + SITEMAP_CHUNK_SIZE));
  }
  return {
    static: staticSitemapEntries(),
    topics: topicSitemapEntries(),
    incidentChunks: chunks,
  };
}

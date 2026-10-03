/**
 * The quality gate. A page exists at two levels: routable and indexable.
 * Every route renders (a 404 for missing entities), but only pages that pass
 * these checks go in the sitemap and shed their `noindex`.
 *
 * The checks are about *substance*, not word count. An incident is not thin
 * because its write-up is short; it is thin when the structured record that
 * makes it a unique page — a symptom, real constraints, evidence, a diagnosis
 * — is missing. Same for a topic: a hub for a corpus with one incident is not
 * a hub, and would index as a near-duplicate of that incident.
 *
 * Thresholds are configurable so a validator and a page cannot drift apart,
 * and so the rules can move as content grows without touching call sites.
 */

import { incidents, topicMeta, incidentsByTopic, type Incident, type Topic } from "@/lib/incidents";
import type { SEOEligibility } from "./types";

export const ELIGIBILITY_THRESHOLDS = {
  /** A topic hub needs at least this many published incidents to stand alone. */
  minTopicIncidents: 2,
  /** Slugs/titles below this many characters read as placeholders. */
  minTitleLength: 12,
  minDescriptionLength: 30,
} as const;

/** A duplicate slug would silently shadow a page — one Map, built once. */
const slugCounts = new Map<string, number>();
for (const incident of incidents) {
  slugCounts.set(incident.slug, (slugCounts.get(incident.slug) ?? 0) + 1);
}

export function getIncidentEligibility(incident: Incident): SEOEligibility {
  const reasons: SEOEligibility["reasons"] = [];

  if (!incident.slug || !/^[a-z0-9-]+$/.test(incident.slug)) {
    reasons.push("no-search-intent");
  }
  if ((slugCounts.get(incident.slug) ?? 0) > 1) reasons.push("duplicate-slug");
  if (incident.title.trim().length < ELIGIBILITY_THRESHOLDS.minTitleLength) {
    reasons.push("incomplete-content");
  }
  if (incident.symptom.trim().length < ELIGIBILITY_THRESHOLDS.minDescriptionLength) {
    reasons.push("incomplete-content");
  }
  if (
    incident.constraints.length === 0 ||
    incident.evidence.length === 0 ||
    !incident.diagnosis.trim() ||
    !incident.question.trim()
  ) {
    reasons.push("incomplete-content");
  }
  if (!topicMeta(incident.topic)) reasons.push("incomplete-content");

  return { indexable: reasons.length === 0, reasons: reasons.length ? reasons : ["unique-content"] };
}

export function getTopicEligibility(topic: Topic): SEOEligibility {
  const meta = topicMeta(topic);
  const count = incidentsByTopic(topic).length;

  if (!meta.description.trim()) {
    return { indexable: false, reasons: ["incomplete-content"] };
  }
  if (count < ELIGIBILITY_THRESHOLDS.minTopicIncidents) {
    return { indexable: false, reasons: ["insufficient-topic-depth"] };
  }
  return { indexable: true, reasons: ["unique-content"] };
}

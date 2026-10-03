/**
 * SEOPage builders — the entity-to-SEO projection.
 *
 * Routes call these and get back the single structured object every other
 * SEO concern (metadata, schema, breadcrumbs, eligibility) derives from.
 * Nothing here renders; nothing here reads the request. A route that renders
 * an incident never builds its own title — it asks for this.
 */

import { topicMeta, type Incident, type Topic } from "@/lib/incidents";
import { incidentBreadcrumbs, topicBreadcrumbs } from "./breadcrumbs";
import { canonicalPath, incidentPath, topicPath } from "./canonical";
import { getIncidentEligibility, getTopicEligibility } from "./eligibility";
import type { SEOPage } from "./types";

export function buildIncidentSEOPage(incident: Incident): SEOPage {
  const path = incidentPath(incident.slug);
  return {
    type: "incident",
    intent: "diagnose",
    path,
    title: incident.title,
    description: incident.symptom,
    parentPath: topicPath(incident.topic),
    topic: incident.topic,
    breadcrumbs: incidentBreadcrumbs(incident),
    eligibility: getIncidentEligibility(incident),
    lastModified: incident.publishedAt,
  };
}

export function buildTopicSEOPage(topic: Topic): SEOPage {
  const meta = topicMeta(topic);
  const path = topicPath(topic);
  return {
    type: "topic",
    intent: "browse-topic",
    path,
    title: `${meta.label} incidents`,
    description: meta.description,
    parentPath: "/topics",
    topic,
    breadcrumbs: topicBreadcrumbs(topic),
    eligibility: getTopicEligibility(topic),
    lastModified: new Date().toISOString().slice(0, 10),
  };
}

export function buildStaticSEOPage(input: {
  path: string;
  title: string;
  description: string;
  intent: SEOPage["intent"];
  lastModified?: string;
}): SEOPage {
  return {
    type: "static",
    intent: input.intent,
    path: canonicalPath(input.path),
    title: input.title,
    description: input.description,
    parentPath: "/",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: input.title, path: canonicalPath(input.path) },
    ],
    eligibility: { indexable: true, reasons: ["unique-content"] },
    lastModified: input.lastModified ?? new Date().toISOString().slice(0, 10),
  };
}

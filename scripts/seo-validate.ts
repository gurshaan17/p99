/**
 * `npm run seo:validate` — the content corpus checked against the SEO rules,
 * before Google ever sees them.
 *
 * Severity semantics:
 * - ERROR   a defect that would publish as a bad page (duplicate slug, invalid
 *           metadata, a sitemap listing a noindex URL). Exit code 1.
 * - WARNING a smell worth a human look (two titles normalizing to the same
 *           string, a topic hub too thin to index). Exit code stays 0.
 * - INFO    counts and coverage, so CI logs show the shape of the corpus.
 *
 * Run it locally before publishing a batch of content, and in CI on every PR
 * that touches `content/`. It is the same gate the site applies at render
 * time — the eligibility rules and sitemap rules it validates against are the
 * very functions the routes call, so it cannot drift from the app.
 */

import { publishedIncidents, TOPICS, incidentsByTopic } from "../lib/incidents";
import { getIncidentEligibility, getTopicEligibility } from "../lib/seo/eligibility";
import { incidentBreadcrumbs, topicBreadcrumbs } from "../lib/seo/breadcrumbs";
import { breadcrumbSchema, incidentSchema, topicSchema } from "../lib/seo/schema";
import { incidentSitemapEntries, topicSitemapEntries, staticSitemapEntries } from "../lib/seo/sitemap";
import { canonicalPath } from "../lib/seo/canonical";

let errors = 0;
let warnings = 0;

function error(message: string) {
  errors += 1;
  console.error(`ERROR: ${message}`);
}

function warn(message: string) {
  warnings += 1;
  console.warn(`WARNING: ${message}`);
}

function info(message: string) {
  console.log(`INFO: ${message}`);
}

const incidents = publishedIncidents();
info(`${incidents.length} published incidents, ${TOPICS.length} topics`);

// 1. Slug / title / description uniqueness across the incident corpus.
const by = <T>(values: T[]) => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
};

for (const [slug, n] of by(incidents.map((i) => i.slug))) {
  if (n > 1) error(`Duplicate slug "${slug}" on ${n} incidents`);
}
for (const [title, n] of by(incidents.map((i) => i.title.trim()))) {
  if (n > 1) error(`Duplicate title "${title}" on ${n} incidents`);
}
for (const [, n] of by(incidents.map((i) => i.symptom.trim()))) {
  if (n > 1) warn(`Duplicate symptom text across ${n} incidents — near-duplicate descriptions`);
}

// 1b. Titles that normalize to the same thing are a cannibalization smell:
// two pages targeting one query.
const normalized = new Map<string, string[]>();
for (const incident of incidents) {
  const key = incident.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  normalized.set(key, [...(normalized.get(key) ?? []), incident.slug]);
}
for (const [key, slugs] of normalized) {
  if (slugs.length > 1) warn(`Titles normalize to "${key}": ${slugs.join(", ")}`);
}

// 2. Canonical URLs must be unique and well-formed.
const allPaths = [
  ...incidents.map((i) => `/q/${i.slug}`),
  ...TOPICS.map((t) => `/topics/${t.id}`),
  "/", "/archive", "/topics", "/about", "/streak",
];
for (const path of allPaths) {
  if (canonicalPath(path) !== path) error(`Non-canonical path casing/slash: ${path}`);
}
for (const [path, n] of by(allPaths)) {
  if (n > 1) error(`Duplicate canonical path generated: ${path}`);
}

// 3. Every incident must pass the quality gate.
for (const incident of incidents) {
  const eligibility = getIncidentEligibility(incident);
  if (!eligibility.indexable) {
    error(`Incident "${incident.slug}" fails eligibility: ${eligibility.reasons.join(", ")}`);
  }
}

// 4. Topic hubs: thin hubs are a noindex warning, not an error — the page
// still serves navigation.
for (const topic of TOPICS) {
  const eligibility = getTopicEligibility(topic.id);
  const count = incidentsByTopic(topic.id).length;
  if (!eligibility.indexable) {
    warn(`Topic "${topic.id}" is noindex (${eligibility.reasons.join(", ")}; ${count} published incidents)`);
  }
}

// 5. Structured data must parse and carry its required keys.
for (const incident of incidents) {
  const schema = incidentSchema(incident);
  JSON.parse(JSON.stringify(schema));
  if (schema["@type"] !== "Article" || !schema.headline) {
    error(`Incident schema invalid for ${incident.slug}`);
  }
  const crumbs = breadcrumbSchema(incidentBreadcrumbs(incident));
  if (crumbs.itemListElement.length < 2) {
    error(`Breadcrumb schema too short for ${incident.slug}`);
  }
}
for (const topic of TOPICS) {
  const schema = topicSchema(topic.id, incidentsByTopic(topic.id));
  if (schema["@type"] !== "CollectionPage" || schema.hasPart.length === 0) {
    warn(`Topic schema for "${topic.id}" has no items (empty topic?)`);
  }
  const crumbs = breadcrumbSchema(topicBreadcrumbs(topic.id));
  if (crumbs.itemListElement.length !== 3) {
    error(`Topic breadcrumb schema wrong length for ${topic.id}`);
  }
}

// 6. Sitemap consistency: no noindex URL, no duplicates, valid dates, same
// eligibility decision as the renderer (both read the same functions).
const sitemapUrls = [
  ...staticSitemapEntries(),
  ...topicSitemapEntries(),
  ...incidentSitemapEntries(),
].map((entry) => entry.loc);

for (const [loc, n] of by(sitemapUrls)) {
  if (n > 1) error(`Sitemap lists ${loc} ${n} times`);
}
for (const incident of incidents) {
  const eligibility = getIncidentEligibility(incident);
  const inSitemap = incidentSitemapEntries().some((e) => e.loc.endsWith(`/q/${incident.slug}`));
  if (eligibility.indexable !== inSitemap) {
    error(`Sitemap/eligibility mismatch for /q/${incident.slug}`);
  }
}
for (const entry of staticSitemapEntries()) {
  if (Number.isNaN(Date.parse(entry.lastModified))) {
    error(`Invalid lastmod for ${entry.loc}`);
  }
}

console.log(
  errors === 0
    ? `\nOK — ${warnings} warning(s), 0 errors. ${sitemapUrls.length} URLs across all sitemaps.`
    : `\nFAILED — ${errors} error(s), ${warnings} warning(s).`,
);
process.exit(errors === 0 ? 0 : 1);

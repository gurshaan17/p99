/**
 * JSON-LD builders. Every object emitted here describes content that is
 * actually on the page — BreadcrumbList from the visible trail, Article from
 * the incident record, CollectionPage from a real listing. Nothing is
 * fabricated to qualify for a rich result: no FAQPage (the page has a
 * rubric, not FAQs), no Product, no ratings.
 *
 * `@id`s are canonical URLs so a page carries one identity for crawlers, not
 * three spellings of the same URL in different blocks.
 */

import { site } from "@/lib/site";
import { ORIGIN } from "@/lib/origin";
import { absoluteCanonical } from "./canonical";
import type { Breadcrumb } from "./types";
import type { Incident, Topic } from "@/lib/incidents";
import { topicMeta } from "@/lib/incidents";

export function breadcrumbSchema(crumbs: Breadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteCanonical(ORIGIN, crumb.path),
    })),
  };
}

/**
 * The incident is a one-question exercise answered later by the same reader,
 * so `Article` is the honest type: headline, date, an abstract (the symptom),
 * and the author of the lesson. The diagnosis/fix are not in the schema
 * because the page withholds them until the reader commits — the structured
 * data describes the page as rendered, not the corpus behind it.
 */
export function incidentSchema(incident: Incident) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: incident.title,
    description: incident.symptom,
    datePublished: incident.publishedAt,
    dateModified: incident.publishedAt,
    mainEntityOfPage: absoluteCanonical(ORIGIN, `/q/${incident.slug}`),
    author: { "@type": "Organization", name: site.name, url: ORIGIN },
    publisher: { "@type": "Organization", name: site.name, url: ORIGIN },
    articleSection: topicMeta(incident.topic).label,
    keywords: incident.tags.join(", "),
  };
}

/** A topic hub is a collection of its incidents, ordered newest first. */
export function topicSchema(topic: Topic, incidents: Incident[]) {
  const meta = topicMeta(topic);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${meta.label} incidents`,
    description: meta.description,
    mainEntityOfPage: absoluteCanonical(ORIGIN, `/topics/${topic}`),
    hasPart: incidents.map((incident) => ({
      "@type": "Article",
      headline: incident.title,
      url: absoluteCanonical(ORIGIN, `/q/${incident.slug}`),
      datePublished: incident.publishedAt,
    })),
  };
}

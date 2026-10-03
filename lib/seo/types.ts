/**
 * The SEO domain model — every indexable page answers to one of these shapes.
 *
 * A route never invents its own title/description/canonical/schema/links: it
 * asks the SEO core for an `SEOPage` and renders what comes back. That is what
 * keeps page-type rules ("a topic needs at least N incidents to index") in one
 * place instead of scattered across route components.
 */

import type { Topic } from "@/content/incidents";

export type SEOPageType = "home" | "incident" | "topic" | "collection" | "static";

export type SEOPageIntent =
  | "diagnose" // one concrete production failure, one answer
  | "browse-topic" // incidents filed under one area
  | "browse-all" // the archive / topics index
  | "reference"; // about, streak — exists for the product, indexable by nature

export type SEOEligibilityReason =
  | "unique-content"
  | "incomplete-content"
  | "insufficient-topic-depth"
  | "duplicate-slug"
  | "invalid-canonical"
  | "no-search-intent";

/**
 * The verdict from the quality gate. `indexable` drives the robots directive
 * and sitemap inclusion; `reasons` is for humans — the validator and this doc
 * explain each one — never something a crawler reads.
 */
export interface SEOEligibility {
  indexable: boolean;
  reasons: SEOEligibilityReason[];
}

/** One step in the visible breadcrumb and its JSON-LD twin. */
export interface Breadcrumb {
  name: string;
  /** Root-relative canonical path, e.g. `/topics/databases`. */
  path: string;
}

/**
 * Everything a route needs to render SEO-correctly, derived at request time
 * from a single entity. `path` is the canonical path — always root-relative,
 * lowercase, no trailing slash, no query.
 */
export interface SEOPage {
  type: SEOPageType;
  intent: SEOPageIntent;
  path: string;
  title: string;
  description: string;
  /** Parent hub in the hierarchy, if any. `/` for top-level pages. */
  parentPath: string;
  topic?: Topic;
  breadcrumbs: Breadcrumb[];
  eligibility: SEOEligibility;
  /** ISO date — last meaningful content change, for sitemap lastmod. */
  lastModified: string;
}

/**
 * Structured metadata — the single place a route's `Metadata` is composed.
 *
 * Composes the existing site-level pieces (`OPEN_GRAPH`, `ALTERNATE_TYPES`,
 * `TWITTER` in `lib/metadata.ts`) rather than re-declaring them: a page that
 * sets `openGraph` replaces the layout's object, so spreading is load-bearing.
 * Adds the thing only the SEO core knows: the eligibility verdict as the
 * robots directive, and an OG `type` that matches the page kind.
 *
 * Titles come from the entity (`incident.title`, the topic's curated label),
 * never from a template with a keyword suffix. The layout's `title.template`
 * appends ` — p99`; do not hardcode that here too.
 */

import type { Metadata } from "next";
import { ALTERNATE_TYPES, OPEN_GRAPH, TWITTER } from "@/lib/metadata";
import { canonical } from "./canonical";
import type { SEOPage } from "./types";

export function buildMetadata(page: SEOPage): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: canonical(page.path), types: ALTERNATE_TYPES },
    openGraph: {
      ...OPEN_GRAPH,
      url: canonical(page.path),
      title: page.title,
      description: page.description,
      type: page.type === "incident" ? "article" : "website",
    },
    // No explicit twitter title/description: like the layout, fall back to the
    // page's own title/description rather than maintaining a second copy.
    twitter: TWITTER,
    robots: page.eligibility.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

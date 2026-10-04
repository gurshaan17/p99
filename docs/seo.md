# SEO architecture

This document explains the SEO system as it exists in the codebase: what page
types exist, how each one derives its metadata, schema, canonical, breadcrumbs
and indexability, how internal links are computed, how sitemaps are
segmented, and how the whole thing scales. It is written to be changed when
the code changes — if you find it drifting from `lib/seo/`, fix the doc in the
same PR.

## Principles

1. **A page exists because it is useful, not because it is generable.**
   Incidents, topic hubs and the static product pages. No tag pages, no
   keyword-permutation URLs, no "every combination" matrices. Tags remain a
   filtering mechanism on the archive.
2. **One structured model, many outputs.** Metadata, JSON-LD, breadcrumbs,
   eligibility and sitemap entries are all projections of the same
   `SEOPage`-shaped object. A route never hand-rolls SEO rules.
3. **The same functions answer two questions:** "what does this URL emit?"
   and "where should this URL appear?". The sitemap and the validator read
   exactly what the route reads, so they cannot disagree silently.
4. **noindex is a first-class outcome.** A page that fails the quality gate
   still renders (navigation must work), but it is `noindex,follow` and absent
   from every sitemap segment.

## Page types

| Type | Route | Indexable when | Schema |
| --- | --- | --- | --- |
| home | `/` | always | — (site-wide OG from layout) |
| incident | `/q/[slug]` | passes `getIncidentEligibility` | `Article` + `BreadcrumbList` |
| topic hub | `/topics/[topic]` | ≥ `minTopicIncidents` published incidents | `CollectionPage` + `BreadcrumbList` |
| collection index | `/topics`, `/archive` | always | — |
| static | `/about`, `/streak` | always | — |

The conceptual hierarchy is `Topic hub → Incident → Related incidents → Topic
hub`. Tags never become pages; topics never become tag lists.

## The SEO core (`lib/seo/`)

- `types.ts` — `SEOPage`, `SEOPageType`, `SEOPageIntent`, `SEOEligibility`,
  `Breadcrumb`. The shared vocabulary; nothing in here computes anything.
- `canonical.ts` — one spelling for a URL: lowercase, root-relative, no query,
  no hash, no trailing slash except `/`. Every metadata canonical, schema
  `@id`, breadcrumb `item` and sitemap `loc` goes through it.
- `breadcrumbs.ts` — the visible trail and the schema list are the same array.
- `eligibility.ts` — the quality gate. Checks substance (title/symptom/
  constraints/evidence/diagnosis presence, duplicate slugs in the registry,
  topic depth), not word count. Thresholds live in `ELIGIBILITY_THRESHOLDS`.
- `related.ts` — deterministic related-content engine. See below.
- `metadata.ts` — `buildMetadata(page)` composes the existing
  `OPEN_GRAPH`/`ALTERNATE_TYPES`/`TWITTER` pieces plus the eligibility-driven
  `robots` directive. No route spreads `openGraph` by hand anymore.
- `schema.ts` — JSON-LD builders. Truthful only: no `FAQPage`, no ratings, no
  fabricated Q&A. Incident schemas describe the page as rendered (the
  diagnosis stays withheld until the reader commits — the schema says so by
  omission).
- `pages.ts` — entity → `SEOPage` projections. This is what a route calls.
- `sitemap.ts` — the URL lists, segmented and chunked. Route handlers serialize.

## Metadata

Every indexable page gets, deterministically:

- `title` from the entity (`incident.title`, `${topic.label} incidents`),
  suffixed once by the layout's `title.template`.
- `description` from the entity (incident symptom, curated topic description).
- `alternates.canonical` — root-relative, built by `canonical.ts`.
- `openGraph.url`/`title`/`description` and `type: article|website`;
  `images` inherited unchanged from `lib/metadata.ts` (one site-wide card).
- `twitter.card` inherited; title/description fall through from OG.
- `robots` — `index,follow` when eligible, `noindex,follow` when not.

## Internal linking

Every incident page carries:

1. a breadcrumb trail (`Home / Topics / {topic} / {title}`),
2. a topic link in the header to its hub,
3. a bounded "Related incidents" list,
4. the archive link.

Every topic hub carries: breadcrumbs, the incident list, and up to 3 related
topics. No page ever renders an unbounded link list — `RELATED_LIMIT` caps
it, and relatedness is computed, not sprinkled.

## The related-content algorithm

```
score(A, B) = topicWeight + tagWeight
topicWeight = 2                     if same topic, else 0
tagWeight   = min(#sharedTags, 3)   otherwise
```

Ties break by `publishedAt` desc, then slug asc — total order, stable across
renders, no self-links. Candidates come from two prebuilt indexes
(incidents-by-topic, incidents-by-tag), so cost is linear in tag memberships,
not O(pages²). The index rebuilds only when the publish day flips
(`publishDayKey`), and `publishedIncidents()` is memoized per publish day in
`lib/incidents.ts`, so all derived lists share one cache lifetime.

## Eligibility

`getIncidentEligibility` fails when: the slug is missing/malformed or
duplicated in the registry, the title is shorter than `minTitleLength`, the
symptom is shorter than `minDescriptionLength`, or any of
constraints/evidence/diagnosis/question is empty. `getTopicEligibility` fails
when the curated description is empty or fewer than `minTopicIncidents`
incidents are published. Reasons are enumerated, in the type, and surfaced by
the validator. Word count is deliberately *not* a signal: the structured
record *is* the content.

## Sitemaps

- `GET /sitemap.xml` — the sitemap index (`app/sitemap.xml/route.ts`).
  Lists only segments that have URLs.
- `GET /sitemap/static.xml` — `/`, `/archive`, `/topics`, `/about`, `/streak`, `/submit`,
  with `lastmod` = newest incident date.
- `GET /sitemap/topics.xml` — eligible topic hubs only.
- `GET /sitemap/incidents-N.xml` — eligible incidents, newest first, chunked at
  5,000 URLs per file (protocol cap is 50,000; smaller chunks keep files
  streamable and diffable).

Sitemap generation is decoupled from page generation: a sitemap URL never
implies a prerendered page, and vice versa. Only eligible, canonical,
trailing-slash-free URLs are listed, each with an accurate `lastmod`.

## Rendering and caching

- All listing pages and incident/topic pages are ISR with `revalidate = 3600`,
  plus the publish-cron revalidation of the root layout at `PUBLISH_CRON`.
- Incident and topic pages prerender their published set at build time
  (`generateStaticParams`), `dynamicParams` stays on so a not-yet-published
  slug renders on demand (and 404s until its publish instant).
- `/rss.xml`, `/llms.txt`, sitemap routes are dynamic handlers with edge
  cache headers; they read the same per-day memoized lists.
- The entire SEO core is pure functions over the in-memory registry — no
  requests, no fs walks at render time.

## Validation

`npm run seo:validate` (`scripts/seo-validate.ts`) exits non-zero on ERRORs:
duplicate slugs/titles, non-canonical paths, eligibility failures, sitemap ↔
eligibility mismatches, schema shape violations. WARNINGs cover near-duplicate
descriptions, normalized-title collisions, and thin topics. CI runs it on
every PR.

## Adding a new page family

1. Decide the entity and its parent hub. Add the route.
2. Write a `buildXSEOPage()` in `lib/seo/pages.ts` producing an `SEOPage`.
3. Implement `getXEligibility()` if the family can be thin or empty.
4. Use `buildMetadata(page)`, the breadcrumb helper, and a truthful schema
   builder in the route. No SEO rules in the route file.
5. Add the segment to `lib/seo/sitemap.ts` and the index list.
6. Extend `scripts/seo-validate.ts` with one uniqueness/consistency check.
7. Add vitest cases mirroring the existing metadata/schema/sitemap suites.

## What deliberately does not exist yet

- No tag pages (`/tags/[tag]`). Add one only when a tag has search intent,
  enough content, a standalone description, and a real lastmod — then it
  becomes a first-class page family per the steps above.
- No FAQ schema (incidents have rubrics, not FAQs).
- No programmatic location pages, comparison pages, or "X vs Y" matrices.
- No search API. When content outlives the archive's usefulness, a real
  indexable search needs a decision about canonicalization of query URLs
  first.

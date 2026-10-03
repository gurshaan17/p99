# SEO implementation audit — final

Answers to the phase-27 checklist, as implemented.

## 1. What SEO page types exist now?

`home` (`/`), `incident` (`/q/[slug]`), `topic` hub (`/topics/[topic]`),
`collection` index (`/topics`, `/archive`), `static` (`/about`, `/streak`).

## 2. Which are indexable?

All static/collection pages and any incident or topic that passes the
quality gate (`lib/seo/eligibility.ts`). Thin topic hubs render but ship
`noindex,follow`.

## 3. Why does each type deserve to exist?

- Incident: the primary, unique content — one real production failure.
- Topic hub: partitions the incident corpus along a curated axis; adds unique
  intro copy and related-topic context rather than a bare list.
- Home/archive/topics index: discovery + browse intent.
- About/streak: product/reference pages that legitimately carry a name.

## 4. How are canonical URLs generated?

`lib/seo/canonical.ts` — lowercase, root-relative, no query/hash, no
trailing slash except root. Used by metadata canonicals, OG `url`, schema
`mainEntityOfPage`, breadcrumb `item`, and every sitemap `loc`.

## 5. How is metadata generated?

`buildMetadata(page)` in `lib/seo/metadata.ts`: title/description/canonical
from the `SEOPage`, OG url/title/description/type from the page, images
inherited from `lib/metadata.ts`, robots from eligibility.

## 6. How is schema generated?

`lib/seo/schema.ts` builders: `Article` for incidents, `CollectionPage` for
topic hubs, `BreadcrumbList` everywhere a trail renders. Truthful-only rule;
no FAQ/Product/ratings.

## 7. How are internal links generated?

Breadcrumbs (header), topic link in the incident header, bounded "Related
incidents" on incident pages, incident lists + related topics on topic hubs.
All via `getRelatedIncidents` / `getRelatedTopics` — deterministic scoring,
indexed, bounded, no self-links.

## 8. How are duplicate pages detected?

The validator: duplicate slugs, titles, and symptom texts; normalized-title
collisions; duplicate canonical paths; sitemap duplicate locs.

## 9. How is cannibalization detected?

Normalized-title collision warnings + duplicate symptom text warnings. No
automatic deletion — surfaced only.

## 10. How are sitemaps generated?

`lib/seo/sitemap.ts` builds segments (static / topics / incidents chunked at
5,000); `/sitemap.xml` route handler emits the sitemap index;
`/sitemap/[segment]` serializes each segment. Eligibility-filtered,
deterministic ordering, accurate lastmod.

## 11. How does rendering work?

Server components; ISR `revalidate = 3600` on pages; incident/topic pages
prerender published content and serve on-demand for later slugs
(`dynamicParams` default). Dynamic only for feeds/llms.txt/sitemaps, with
edge cache headers.

## 12. How does caching work?

Publish-day-memoized `publishedIncidents()`; the related index rebuilds only
when the publish day flips; edge `s-maxage` on dynamic routes; cron
revalidation at `PUBLISH_CRON` with the hourly ISR as net.

## 13. What happens at 10k pages?

- Build: one module per incident, one import in the registry — build time
  grows roughly linearly (content parsing), no O(n²) anywhere; the related
  index is a single linear pass.
- Memory: the whole corpus stays in memory; acceptable at 10k, worth
  watching at 100k.
- Sitemap: one incidents segment (~2–3 files); index grows trivially.
- Metadata/schema/related: per-request constant work from memoized lists.

## 14. What happens at 100k pages?

- The registry-as-TS-modules approach should give way to a real data store
  behind the same shape (`incidents`, `getIncident`, `publishedIncidents`
  keep their signatures). `lib/incidents.ts` is the seam.
- Sitemap: ~20 incident segments, still fine; the index keeps it crawlable.
- `generateStaticParams` should stop prerendering every incident and
  pre-render only the recent/hot set; `dynamicParams` already supports this.
- Related indexes must become incremental or sharded; the current in-memory
  per-day rebuild becomes a minutes-scale operation.

## 15. Biggest remaining scalability risk

The in-memory, import-everything-into-one-bundle content registry. It is the
one thing that ties build size and cold-start memory to content count.
Everything else (sitemap, relatedness, eligibility) was designed to outlive
the swap.

## 16. Biggest remaining SEO risk

Thin topic hubs and incidents published with placeholder symptoms passing
eligibility. The gate is structural, not editorial — a human still decides
what deserves a PR.

## 17. What should NOT be implemented yet

Tag pages, FAQ schema, search result indexing, location pages, comparison
matrices, AI-similarity relatedness, per-incident OG images, and a database.
Each becomes appropriate only when content volume or intent data forces it —
the seams for all of them now exist.

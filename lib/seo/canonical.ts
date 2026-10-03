/**
 * Canonical URL construction — one rule, everywhere.
 *
 * A canonical must be deterministic: the same entity always maps to the same
 * path, and a path always has exactly one spelling. Query strings, hashes and
 * trailing-slash variants are never canonical (they also never reach a page —
 * the app has no query-driven routes — but the builder strips them so a stray
 * `?utm_source=` in a link can never produce a second copy of a page in the
 * sitemap or a schema block).
 */

/** Normalize a path to its canonical form. */
export function canonicalPath(path: string): string {
  let p = path.split(/[?#]/, 1)[0].toLowerCase();
  if (!p.startsWith("/")) p = `/${p}`;
  // No trailing slash anywhere except the root — App Router's canonical form.
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p;
}

/** Root-relative canonical for Metadata `alternates` and Open Graph. */
export function canonical(path: string): `/${string}` {
  return canonicalPath(path) as `/${string}`;
}

/** Absolute canonical, for JSON-LD, sitemaps and feed cross-references. */
export function absoluteCanonical(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}${canonicalPath(path)}`;
}

/** The incident's canonical path. */
export function incidentPath(slug: string): string {
  return canonicalPath(`/q/${slug}`);
}

/** The topic hub's canonical path. */
export function topicPath(topicId: string): string {
  return canonicalPath(`/topics/${topicId}`);
}

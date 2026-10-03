import { ORIGIN } from "@/lib/origin";
import { sitemapSegments } from "@/lib/seo/sitemap";

/**
 * The sitemap index. Next's `generateSitemaps` emits the segment urlsets at
 * `/sitemap/<id>.xml` but no index document, and the index is the path every
 * crawler tries first — so this route answers for it. Robots still lists the
 * segments directly (belt and suspenders), since some readers only follow
 * `Sitemap:` lines.
 *
 * Only the segment ids that actually exist are listed: an index entry for a
 * chunk that has no URLs would be a 404 behind a 200.
 */
export async function GET() {
  const segments = sitemapSegments();
  const ids = ["static", "topics", ...segments.incidentChunks.map((_, i) => `incidents-${i}`)];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids
  .map(
    (id) => `  <sitemap>
    <loc>${ORIGIN}/sitemap/${id}.xml</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

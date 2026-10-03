import type { NextRequest } from "next/server";
import { sitemapSegments } from "@/lib/seo/sitemap";
import { escapeXml } from "@/lib/xml";

/**
 * One sitemap segment per file. The segment ids are the same ones the index
 * at `/sitemap.xml` advertises: `static`, `topics`, `incidents-N`. Eligibility
 * is enforced in `lib/seo/sitemap.ts`, so this route only serializes.
 *
 * A segment id that does not exist returns an empty urlset rather than a 404,
 * because a crawler that guessed `incidents-9` after a corpus shrink should
 * not record a hard failure — the url is well-formed, it is simply out of
 * range, and the index no longer points at it.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ segment: string }> },
) {
  const { segment } = await context.params;
  const segments = sitemapSegments();

  let entries;
  if (segment === "static.xml" || segment === "static") entries = segments.static;
  else if (segment === "topics.xml" || segment === "topics") entries = segments.topics;
  else {
    const match = /^incidents-(\d+)(\.xml)?$/.exec(segment);
    entries = match ? segments.incidentChunks[Number(match[1])] : undefined;
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(entries ?? [])
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastModified}</lastmod>${entry.changeFrequency ? `\n    <changefreq>${entry.changeFrequency}</changefreq>` : ""}${entry.priority ? `\n    <priority>${entry.priority}</priority>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

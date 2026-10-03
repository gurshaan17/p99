import { publishedIncidents } from "@/lib/incidents";
import { ORIGIN } from "@/lib/origin";
import { site } from "@/lib/site";
import { escapeXml } from "@/lib/xml";

/**
 * RSS 2.0 feed — DESIGN.md section 8.5.
 *
 * A route handler rather than a static file for one reason: the item set depends on
 * `publishedAt <= now`, and a file written at build time would keep serving a
 * future-dated incident once the build predates it. Vercel also serves this far
 * better from a function than as a generated asset.
 *
 * The channel copy is `site.description` rather than a second string. The sidebar
 * already says it, and a feed that described the site differently from the site
 * would be two sources for one fact.
 *
 * Only `symptom` goes in the description. It is the one field written to be read
 * before the diagnosis is revealed, which is the only thing a feed reader can
 * honestly show — the whole point of the site is that the answer is withheld, and
 * a feed that leaked it would spoil it in the one place nobody asked to be spoiled.
 */

export const dynamic = "force-dynamic";

/**
 * Absolute base URL comes from `lib/origin`, which the social preview metadata
 * also reads — a feed pointing at a different host than the page's own card is
 * the kind of inconsistency nobody catches before shipping.
 */

/** RSS requires RFC 822 dates, not ISO 8601. */
function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

export function GET() {
  const incidents = publishedIncidents();
  const built = new Date().toUTCString();

  const items = incidents
    .map((incident) => {
      const url = `${ORIGIN}/q/${incident.slug}`;
      return `    <item>
      <title>${escapeXml(incident.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${rfc822(incident.publishedAt)}</pubDate>
      <description>${escapeXml(incident.symptom)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(ORIGIN)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>en</language>
    <lastBuildDate>${built}</lastBuildDate>
    <atom:link href="${escapeXml(`${ORIGIN}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // The feed only changes when an incident is published, but `built` is a
      // wall-clock stamp in the body, so it is not byte-stable. A short shared
      // cache keeps that honest without pinning a stale item list for long.
      //
      // It also means a subscriber polling in the first hour after the publish
      // instant can be served the previous list: `s-maxage` is the edge's cache
      // and the revalidation cron does not reach it. Same bound as the pages'
      // own `revalidate`, which is the standard this one is measured against.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

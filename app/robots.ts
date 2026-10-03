import type { MetadataRoute } from "next";
import { ORIGIN } from "@/lib/origin";

/**
 * Robots — an allow-all crawl policy for public pages, with the API routes
 * kept out of the crawl budget.
 *
 * Points at the sitemap *index*; the index in turn lists every segment, so
 * adding a segment (more incident chunks) requires no change here.
 *
 * This is not a substitute for canonical/noindex: `noindex` on a page is the
 * signal, robots is only an efficiency decision.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}

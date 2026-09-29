import { OG_IMAGE, site } from "@/lib/site";

/**
 * The social card, defined once.
 *
 * Pages must spread this and add their own `url` rather than declaring an
 * `openGraph` object of their own. Metadata segments are merged by replacing
 * duplicate keys, and `openGraph` is a single key — so a page that sets only
 * `openGraph: { url: "/topics" }` silently discards the image, the type and the
 * site name that the layout declared. Nothing errors, the page still renders and
 * still looks right, and the card is gone from every route except whichever one
 * happened to declare it. That is the failure mode this file exists to prevent.
 *
 * The array is deliberately not `as const`: `Metadata` wants a mutable array, and
 * a readonly one is not assignable to it.
 */
export const OPEN_GRAPH = {
  type: "website",
  siteName: site.name,
  locale: "en_GB",
  images: [
    {
      url: OG_IMAGE.path,
      width: OG_IMAGE.width,
      height: OG_IMAGE.height,
      alt: OG_IMAGE.alt,
      type: "image/png",
    },
  ],
};

/**
 * The feed and `/llms.txt`, declared once and spread by pages.
 *
 * The same replacement rule as `openGraph` above, and here it is not
 * hypothetical: `alternates` is a single key, and every one of the five pages
 * declares its own `alternates.canonical`. That replaced the layout's `types`
 * wholesale on all of them, so the RSS autodiscovery link had never once been in
 * the head of a page — the layout had declared it, no page kept it, and a link
 * that renders nowhere is not a link. This is the kind of thing that reads as
 * working, because the declaration is sitting right there in the layout.
 *
 * The layout still declares it, and now the 404 is the only route relying on that
 * copy — every page, incident pages included, sets its own `alternates` and has to
 * spread this by hand.
 */
export const ALTERNATE_TYPES = {
  "application/rss+xml": "/rss.xml",
  "text/markdown": "/llms.txt",
};

/**
 * Declared in the layout only, and not spread by pages.
 *
 * It is safe to leave in one place precisely because no page overrides `twitter`,
 * so nothing replaces it — the same replacement rule that makes `openGraph`
 * dangerous here is what keeps this inherited intact. Worth knowing before
 * someone adds a page-specific card: that is the moment this needs spreading too.
 *
 * `summary` renders a 120x120 thumbnail beside the text. This site leads with a
 * wide card, so it gets the large one.
 *
 * `title` and `description` are absent from both objects on purpose. Omitting
 * them is what lets each page's own title and description win, so a shared link
 * reads "Topics — p99" rather than "p99" on all five routes.
 */
export const TWITTER = {
  card: "summary_large_image",
  images: [{ url: OG_IMAGE.path, alt: OG_IMAGE.alt }],
};

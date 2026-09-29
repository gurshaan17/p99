/**
 * Site-level configuration — the one place for values that are not design
 * tokens or content.
 */

export const site = {
  name: "p99",
  tagline: "One production incident a day.",
  /**
   * The full one-liner. Was hardcoded in two places (the sidebar intro and the
   * document metadata) while `tagline` held the short form, so a third copy would
   * have been the obvious way to reach the feed and the wrong one — the sentence
   * would then have three homes and no owner. Promoted here instead, since this
   * module is the one place for values that are neither tokens nor content.
   */
  description:
    "One production incident a day. Diagnose the system, not the algorithm.",
  repo: "https://github.com/gurshaan17/p99",
  author: {
    name: "Gurshaan",
    url: "https://gurshaan.xyz",
  },
} as const;

/**
 * Social preview image — the card shown when the site is pasted into a chat, a
 * Slack channel, or a feed reader.
 *
 * Referenced by path and made absolute by `metadataBase`, rather than built as a
 * URL here. The same reason the feed resolves one origin: two places that know
 * how to spell the host will eventually disagree, and the failure is a broken
 * image on someone else's server rather than an error in this one.
 *
 * The dimensions are declared because crawlers are told not to re-fetch and
 * re-decode an image they already hold, and because a consumer can reserve the
 * right box before the bytes arrive instead of reflowing when it loads.
 *
 * 1731x909 is a 1.904:1 ratio — the same 1.91:1 the 1200x630 recommendation
 * describes, so this is that shape at a higher resolution rather than a
 * different one, and no cropping is needed to use it.
 *
 * `alt` is a description rather than a caption. It is read in place of the image
 * when the image cannot be, so it has to carry the card's meaning by itself; the
 * wordmark and tagline are what the card is, so that is what it says.
 */
export const OG_IMAGE = {
  path: "/og-image.png",
  width: 1731,
  height: 909,
  alt: "p99 — One production incident a day. Diagnose the system, not the algorithm.",
} as const;

/**
 * Contact address.
 *
 * `null` until a real inbox exists. Serves both the newsletter signup and the
 * topic-suggestion form. The UI checks this and renders the
 * "not open yet" state instead of a form that cannot deliver anything — a
 * control that pretends to accept a subscription it never sends is worse than no
 * control at all (DESIGN.md section 15, on honest empty states).
 *
 * Set this to a real address to enable the form; nothing else needs to change.
 */
export const CONTACT_EMAIL: string | null = null;

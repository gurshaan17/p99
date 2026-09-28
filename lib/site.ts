/**
 * Site-level configuration — the one place for values that are not design
 * tokens or content.
 */

export const site = {
  name: "p99",
  tagline: "One production incident a day.",
  repo: "https://github.com/gurshaan17/p99",
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

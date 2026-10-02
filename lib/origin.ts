/**
 * Absolute origin — the one place the site's host is resolved.
 *
 * Server-only, and deliberately not in `lib/site.ts`: the sidebar is a client
 * component and imports that module, and this reads deployment environment.
 * `VERCEL_*` are not `NEXT_PUBLIC_`, so Next would substitute `undefined` in the
 * client bundle and ship the fallback instead — harmless, but it puts build-time
 * environment reads into code the browser downloads.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` outranks `VERCEL_URL` so a preview build still
 * resolves to production. That is what a canonical URL and a social card want: a
 * link pasted from a preview should point at the real site, and a card generated
 * for a preview should not advertise a deployment that will be gone. The fallback
 * covers a local dev server, which has neither variable.
 *
 * Shared with `app/rss.xml/route.ts`, which needs the same answer. Two copies of
 * this would drift, and a feed that linked to a different host than the page's
 * social card is the kind of inconsistency nobody notices until it is shipped.
 */
export const ORIGIN = (
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://p99.online"
).replace(/\/$/, "");

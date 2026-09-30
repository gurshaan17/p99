import { site } from "@/lib/site";

/**
 * Footer links and author credit — DESIGN.md sections 2.2, 5.3, 7.8.
 *
 * One component for two placements: the desktop sidebar's footer, and the page
 * footer below `<main>` at small widths. The sidebar is `hidden` below `lg`, so
 * before this existed the footer simply did not exist on a phone — the three
 * links and the credit were desktop-only chrome.
 *
 * Shared rather than written twice, for the same reason `site.description` is
 * promoted out of the sidebar: a link that exists in two places has no owner, and
 * the two copies disagree on the first edit. The callers own their own border and
 * padding, because the sidebar's footer is pinned to the bottom of a full-height
 * column while the mobile one is the last thing in a scrolling page.
 */

/**
 * Footer link styling — DESIGN.md section 7.8, ghost/text action.
 *
 * One constant rather than the same four-class string repeated per link. The
 * underline is transparent until hover so the row reads as labels at rest, and
 * only the hovered link takes `ink` — three quiet links that all light up on
 * hover look like a button group.
 */
const footerLink =
  "decoration-transparent underline-offset-4 hover:decoration-current hover:text-ink hover:underline";

/**
 * Alignment is a prop, not a `className` passthrough. Centring this footer takes
 * two classes on two different elements — `justify-center` on the link row and
 * `text-center` on the credit — so a caller handed the outer element's classes
 * could centre one row and leave the other hanging left, which reads as a bug
 * rather than a decision. The prop keeps both halves together.
 */
export function FooterLinks({ align = "start" }: { align?: "start" | "center" }) {
  const centred = align === "center";

  return (
    <>
      <div className={`flex items-center gap-4${centred ? " justify-center" : ""}`}>
        <a href="/about#newsletter" className={footerLink}>
          Newsletter
        </a>
        <a href="/about" className={footerLink}>
          Info
        </a>
        {/*
          A real link rather than a label. The file exists and is served from
          the same `ORIGIN` as everything else, and it is a plain-text route a
          reader can open — the same reason Newsletter and Info are links here
          rather than dead headings.
        */}
        <a href="/llms.txt" className={footerLink}>
          llms.txt
        </a>
        {/*
          The one icon-only link in the row. The GitHub logo is not in lucide
          (brand icons were removed), so it is inlined as the official mark. It
          points off-site, so like the credit below it gets `noopener noreferrer`,
          and the `sr-only` note both names the icon for a screen reader and
          announces the new tab — the logo alone cannot be assumed to mean GitHub.
        */}
        <a
          href={site.repo}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLink}
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            className="size-4"
            fill="currentColor"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
          </svg>
          <span className="sr-only"> GitHub (opens in a new tab)</span>
        </a>
      </div>
      {/*
        The credit sits below the three links rather than joining them, so the
        footer's first row stays a set of ways into the site and this reads as the
        one thing that points away from it. `noopener` as well as `noreferrer`
        because the target is another origin and a new tab hands it a live
        `window.opener` reference otherwise; the `sr-only` note is the tab change
        announced to a screen reader, which cannot see one.
      */}
      <p className={`mt-3${centred ? " text-center" : ""}`}>
        Made by{" "}
        <a
          href={site.author.url}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLink}
        >
          {site.author.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </>
  );
}

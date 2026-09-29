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

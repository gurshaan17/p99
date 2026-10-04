import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { bodySans, display, mono, pixel } from "./fonts";
import { Frame } from "@/components/shell/frame";
import { ALTERNATE_TYPES, OPEN_GRAPH, TWITTER } from "@/lib/metadata";
import { ORIGIN } from "@/lib/origin";
import { site } from "@/lib/site";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { FooterLinks } from "@/components/shell/footer-links";
import { VisitorCount } from "@/components/shell/visitor-count";
import "./globals.css";

/**
 * `template` is why no page repeats the brand suffix. The four page titles
 * hardcoded "— p99" between them, which is a second home for a string that also
 * lives in the wordmark and the tab title; a page setting `title: "Topics"` now
 * resolves to "Topics — p99" from here.
 */
export const metadata: Metadata = {
  // Everything below is a path until this resolves it. Without a base, `og:image`
  // is emitted as a relative URL, which some crawlers resolve against their own
  // host and some ignore entirely — the card is simply missing, with no error.
  metadataBase: new URL(ORIGIN),
  title: { default: site.name, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  // Autodiscovery, so a reader can find the feed without the topbar link. The
  // `alternates` form is what Next turns into `<link rel="alternate">`; browsers
  // and feed readers both look for it before anything visible on the page.
  //
  // Declaring it here is not sufficient. `alternates` is replaced wholesale by any
  // page that sets its own `canonical`, which all five do — so they spread
  // `ALTERNATE_TYPES` as well, and the copy below is what survives on the routes
  // that set no `alternates` at all. See `ALTERNATE_TYPES` for how that went
  // unnoticed.
  //
  // `/llms.txt` rides the same mechanism, and is the one declaration here that
  // is a convenience rather than a signal a crawler acts on: consumers find
  // `/llms.txt` by convention, having learned the path, not by reading a
  // `<link>`. The spec's own discovery mechanism is `rel="describedby"`, which
  // Next's `alternates` cannot emit — advertising it as a markdown alternate is
  // the closest honest thing available, and it is still true that the file is
  // this site's content in markdown.
  alternates: {
    types: ALTERNATE_TYPES,
  },
  // Deliberately no `alternates.canonical` and no `openGraph.url` here. Both are
  // inherited by every route below this layout, so a single "/" would tell every
  // crawler that /topics, /streak and /archive duplicate the home page. Each page
  // declares its own instead.
  // The icon set has been in `public/favicon/` since it was generated and was
  // never linked from anywhere, so nothing was requesting it. Declared here
  // instead of relying on file-convention detection, which only fires for
  // `app/favicon.ico` — which does exist, and which Next already injects.
  //
  // Hence no `.ico` entry: it would put a second `rel="icon"` link in the head
  // alongside the one the convention emits, and which of the two a browser picks
  // is not something to leave to chance. `public/favicon/favicon.ico` is a
  // byte-identical copy of the `app/` one, from the same commit, so both URLs
  // were the same picture twice over.
  //
  // The SVG is the one worth declaring. The conventional icon is 48x48, which a
  // tab scales up and blurs, and this is the only crisp version the site has.
  icons: {
    icon: [{ url: "/favicon/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/favicon/site.webmanifest",
  // The card lives in `lib/metadata` because pages have to re-declare it — see
  // the note there. Setting `openGraph` on a page replaces this object outright
  // rather than merging into it, so a page that adds only a `url` takes the image
  // down with it.
  openGraph: OPEN_GRAPH,
  twitter: TWITTER,
};

/**
 * `theme-color` lives in `viewport`, not `metadata` — Next has deprecated it in
 * `metadata`, and splitting it leaves a duplicate tag when both are set.
 *
 * Two entries, because the site follows the system preference and a single value
 * can only be right for one of them. These mirror `--bg` in `globals.css`; they
 * are spelled out here because a custom property cannot be read from metadata.
 */
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodySans.variable} ${display.variable} ${pixel.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-page text-ink-2">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <Frame>
            <Sidebar>
              <VisitorCount />
            </Sidebar>
            <div className="flex min-w-0 flex-col">
              <Topbar />
              <main className="flex-1 px-(--pad-x) py-(--pad-y)">{children}</main>
              {/*
                The sidebar carries the footer at `lg`, and it is `hidden` below
                that — so on a phone the links and the credit simply were not on
                the page. Rendered here rather than inside a page so all five
                routes get it from the shell, alongside `Topbar` and `Sidebar`.
                `lg:hidden` because at `lg` the sidebar already shows these, and
                the border would double up.

                A `<footer>` so it is a landmark rather than a last `<div>`, and
                its own `px`/`py` because this column is padded by `<main>`, which
                ends above it.

                `align="center"` because a footer spanning the full width of a
                narrow screen reads as a stranded row stuck to the left edge. At
                `lg` the sidebar footer stays left-aligned, where it sits under a
                left-hand column and shares its edge.
              */}
              <footer className="mt-(--pad-y) border-t border-dashed border-line px-(--pad-x) py-(--pad-y) text-small text-ink-3 lg:hidden">
                <FooterLinks align="center" />
              </footer>
            </div>
          </Frame>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

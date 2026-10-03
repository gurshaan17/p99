import { ORIGIN } from "@/lib/origin";

/**
 * Shared email frame — the DESIGN.md layout language translated into the
 * smallest subset of HTML email clients agree on.
 *
 * Typography fix worth understanding: the first pass set `font-family` only
 * on the inner wrapper div, so any client that strips wrapper styles
 * (Outlook desktop, clients with strict sanitisers) fell all the way back to
 * its serif default — Times New Roman on every platform. The fix is layered:
 *   1. A `<style>` block declaring the stacks, so supporting clients
 *      (Apple Mail, iOS Mail, Samsung, new Outlook) load the real fonts.
 *   2. `@font-face` via the Google Fonts stylesheet link: this is where the
 *      site's actual Geist and Geist Mono come from. Web fonts are honoured
 *      by a growing share of clients and are a no-op elsewhere — never an
 *      error, just a fallback.
 *   3. Inline `font-family` on `<body>`, which clients keep when they strip
 *      everything else. The stack ends in the same system-font fallbacks the
 *      site conceptually uses, so a client that ignores Geist gets a
 *      neutral sans — not a serif — back.
 * Email clients that still strip link stylesheets ignore the `@font-face`
 * import and render the stack from step 3. Gmail is one of those; what it
 * renders is the fallback, which is why the fallback is a real sans and not
 * "Times New Roman".
 */

/** Body sans — the site's Geist, with the system-font fallback stack. */
export const FONT =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Mono role — the site's Geist Mono, with a monospace fallback stack. */
export const MONO =
  '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export const INK = "#111111";
export const MUTED = "#71717a";
export const LINE = "#e4e4e7";
export const ACCENT = "#7c3aed";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px dashed ${LINE};margin:20px 0;" />`;
}

export function sectionLabel(index: string, label: string): string {
  return `<p style="margin:0 0 8px;font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${index}&nbsp;&nbsp;${label}</p>`;
}

/**
 * The unsubscribe URL in one place.
 *
 * Not a live route yet — that is the SNS/unsubscribe step — so this points at
 * the path it will get and the footer carries the same promise. When the
 * unsubscribe work lands, the send path grows a token or the route reads a
 * query param; the renderers stay as they are because they only know about
 * the URL.
 */
export const UNSUBSCRIBE_URL = `${ORIGIN}/unsubscribe`;

function footer(): string {
  return `<p style="margin:0;font-family:${MONO};font-size:11px;line-height:1.6;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};">
      p99 — one production incident a day<br />
      You are getting this because you subscribed. <a href="${UNSUBSCRIBE_URL}" style="color:${MUTED};">Unsubscribe</a>
    </p>`;
}

/** Wrap `inner` in the shared page shell: fonts, background, card. */
export function shellHtml(kickerLine: string, inner: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Geist+Mono&display=swap" rel="stylesheet" />
  <style>
    body, p, h1, li, a { font-family: ${FONT}; }
    .mono { font-family: ${MONO}; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT};color:${INK};">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;background:#ffffff;font-family:${FONT};color:${INK};">
    <p class="mono" style="margin:0 0 4px;font-family:${MONO};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">${kickerLine}</p>
    ${divider()}
    ${inner}
    ${divider()}
    ${footer()}
  </div>
</body>
</html>`;
}

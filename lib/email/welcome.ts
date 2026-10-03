import { ORIGIN } from "@/lib/origin";
import type { RenderedEmail } from "./daily-digest";
import { ACCENT, UNSUBSCRIBE_URL, shellHtml } from "./frame";

/**
 * The welcome email — sent once, when an address first subscribes.
 *
 * Small job: confirm the address is on the list, and set the expectation of
 * what arrives and when — one incident a day at 02:00 IST, matching the
 * site's publish instant.
 */
export function renderWelcome(): RenderedEmail {
  const subject = "You're on the list";

  const inner = `
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">You're on the list.</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Thanks for subscribing. One production incident lands in this inbox each day — symptom, constraints, telemetry, and the question. The diagnosis is on the site, after you make your pick.</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Each post goes live at 02:00 IST; that is when the mail follows.</p>
    <p style="margin:28px 0;">
      <a href="${ORIGIN}" style="display:inline-block;padding:12px 20px;background:${ACCENT};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px;">Read today's incident&nbsp;&rarr;</a>
    </p>`;

  const html = shellHtml("p99&nbsp;&nbsp;·&nbsp;&nbsp;welcome", inner);

  const text = `p99 · welcome

You're on the list.

Thanks for subscribing. One production incident lands in this inbox each day — symptom, constraints, telemetry, and the question. The diagnosis is on the site, after you make your pick.

Each post goes live at 02:00 IST; that is when the mail follows.

Read today's incident: ${ORIGIN}

---
p99 — one production incident a day.
Unsubscribe: ${UNSUBSCRIBE_URL}
`;

  return { subject, html, text };
}

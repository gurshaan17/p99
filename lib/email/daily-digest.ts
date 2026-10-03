import { ORIGIN } from "@/lib/origin";
import type { Incident } from "@/lib/incidents";
import {
  ACCENT,
  UNSUBSCRIBE_URL,
  divider,
  escapeHtml,
  sectionLabel,
  shellHtml,
} from "./frame";

/**
 * The daily digest email. The content is a teaser, not the article —
 * diagnosis and fix stay on the site, where the picks (the product) live.
 * Everything needed to *start* reasoning goes in the mail; the button takes
 * them to `/q/[slug]` to make the pick.
 *
 * Paired plain-text version on every render: not a fallback for clients
 * without HTML, it is a deliverability requirement.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderDailyDigest(incident: Incident): RenderedEmail {
  const url = `${ORIGIN}/q/${incident.slug}`;
  const subject = incident.title;

  const constraints = incident.constraints
    .map((c) => `<li style="margin:0 0 6px;">${escapeHtml(c)}</li>`)
    .join("");
  const evidence = incident.evidence
    .map((e) => `<li style="margin:0 0 6px;">${escapeHtml(e)}</li>`)
    .join("");

  const inner = `
    <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:600;">${escapeHtml(incident.title)}</h1>

    ${sectionLabel("01", "Symptom")}
    <p style="margin:0;font-size:15px;line-height:1.6;">${escapeHtml(incident.symptom)}</p>

    ${divider()}

    ${sectionLabel("02", "Constraints")}
    <ul style="margin:0;padding-left:18px;font-size:15px;line-height:1.6;">${constraints}</ul>

    ${divider()}

    ${sectionLabel("03", "Evidence")}
    <ul style="margin:0;padding-left:18px;font-size:15px;line-height:1.6;">${evidence}</ul>

    ${divider()}

    ${sectionLabel("04", "Question")}
    <p style="margin:0;font-size:15px;line-height:1.6;">${escapeHtml(incident.question)}</p>

    <p style="margin:28px 0;">
      <a href="${url}" style="display:inline-block;padding:12px 20px;background:${ACCENT};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px;">Solve it&nbsp;&rarr;</a>
    </p>`;

  const html = shellHtml("p99&nbsp;&nbsp;·&nbsp;&nbsp;daily incident", inner);

  const text = `p99 · daily incident

${incident.title}

01  SYMPTOM
${incident.symptom}

02  CONSTRAINTS
${incident.constraints.map((c) => `- ${c}`).join("\n")}

03  EVIDENCE
${incident.evidence.map((e) => `- ${e}`).join("\n")}

04  QUESTION
${incident.question}

Solve it: ${url}

---
p99 — one production incident a day.
Unsubscribe: ${UNSUBSCRIBE_URL}
`;

  return { subject, html, text };
}

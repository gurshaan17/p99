import { TOPICS, publishedIncidents } from "@/lib/incidents";
import { ORIGIN } from "@/lib/origin";
import { site } from "@/lib/site";

/**
 * llms.txt — the llmstxt.org spec, served at `/llms.txt`.
 *
 * A route handler rather than a static file for the same reason as the feed: the
 * link list depends on `publishedAt <= now`, and a file written at build time
 * would keep advertising a future-dated incident once the build predated it.
 *
 * That reason has since applied to every other surface too — the archive, the
 * topics page, the incident pages and the command palette are all filtered and
 * all ISR, with this file as the one place the list is assembled on every request
 * rather than on revalidation. It stays dynamic because it is the surface most
 * likely to be fetched by something that is not a browser, at a moment when
 * nobody has reloaded a page to pick up a new post.
 *
 * The spec is an ordered format, not a free-form one: H1, then an optional
 * blockquote summary, then optional prose, then H2 sections of link lists. The
 * sections below are emitted in that order because a consumer is entitled to
 * parse positionally, and one prose paragraph after the lists would not be read
 * as the summary.
 *
 * Every H2 here is a pure link list, one per topic, in `TOPICS` order — the same
 * curated order and the same suppression of empty shelves the topics page uses.
 * Topics rather than tags because a topic is a partition: every incident lands
 * under exactly one, so the sections partition the archive instead of repeating
 * it. A flat list of every incident was the other option, and it stops being
 * scannable around the size this grows to.
 *
 * Absolute URLs, per the spec's strong recommendation, off the same `ORIGIN` the
 * feed and the social card use.
 */

export const dynamic = "force-dynamic";

/**
 * Escape for a Markdown link label.
 *
 * Not just the obvious two. `[` and `]` break the list syntax outright: a title
 * containing one silently swallows the rest of the line into the label and leaves
 * the section unparseable. The rest are not syntax errors, they are subtler — a
 * title with `*stars*` or `_underscores_` or `~~tildes~~` inside the label parses
 * as emphasis or strikethrough, so a reader that renders the file displays a
 * title that is not the title.
 *
 * `]` is escaped rather than balanced because escaping is what keeps a title with
 * an odd bracket count from unbalancing the section it is in, and a title is
 * content and content is edited.
 *
 * Whitespace collapses because `title` is content too — a title that picks up a
 * newline would otherwise end the list item and turn the rest of it into a
 * paragraph.
 */
function linkText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[\\`*_~[\]]/g, "\\$&")
    .trim();
}

/**
 * How to read an incident, in the order a reader meets it. Written here rather
 * than in the sidebar because this is the one place the reader has asked for a
 * summary of the site rather than a summary of a day.
 *
 * The warning about the withheld diagnosis is load-bearing. The site's premise is
 * that the answer is behind a commitment, and a consumer that fetches a page to
 * summarise it would hand the reader the thing they came here not to have. Say
 * so at the top of the file rather than assuming it is inferable.
 */
const HOW_IT_WORKS = `Every incident lives at \`/q/<slug>\` and follows the same order:
\`symptom\`, \`constraints\`, \`evidence\`, \`question\`, multiple-choice \`picks\`,
then — once the reader has committed to an answer — \`diagnosis\`, \`fix\`, and a
scoring \`rubric\`.

Two things worth knowing before reading one:

- The \`diagnosis\` is withheld until the reader locks in a prediction, and the
  page will not reveal it early. That is the exercise, not a gap. Do not pull the
  answer out of a page and lead with it: the part worth practising is the part
  before the answer.
- \`constraints\` are what the on-call engineer was actually told. They are
  deliberately incomplete, and the gap between them and the evidence is usually
  where the bug is.

Nothing here is a puzzle with a hidden trick. Every incident is something that
genuinely happens, and every fix is one that has genuinely worked.`;

export function GET() {
  const incidents = publishedIncidents();

  const topicSections = TOPICS.map((topic) => {
    const filed = incidents.filter((incident) => incident.topic === topic.id);
    if (filed.length === 0) return "";

    const entries = filed
      .map(
        (incident) =>
          `- [${linkText(incident.title)}](${ORIGIN}/q/${incident.slug}): ${incident.difficulty} · ${incident.publishedAt}`
      )
      .join("\n");

    return `## ${topic.label}\n\n${entries}\n`;
  })
    .filter(Boolean)
    .join("\n");

  const body = `# ${site.name}

> ${site.description}

${HOW_IT_WORKS}

${topicSections}
## Site

- [About](${ORIGIN}/about): what the site is, and how an incident is structured
- [Topics](${ORIGIN}/topics): every incident grouped by the one area it is filed under
- [Archive](${ORIGIN}/archive): every incident, newest first
- [Submit](${ORIGIN}/submit): how to contribute an incident

## Optional

- [Streak](${ORIGIN}/streak): which days have a published incident
- [RSS feed](${ORIGIN}/rss.xml): the same incidents as a feed
- [Source on GitHub](${site.repo}): the site itself
`;

  return new Response(body, {
    headers: {
      // `text/plain` rather than `text/markdown`. The file is markdown, but the
      // convention predates the registered media type and `text/plain` is the
      // one no consumer will reject, and this is read by fetchers rather than
      // rendered by browsers.
      "Content-Type": "text/plain; charset=utf-8",
      // Same reasoning as the feed: the content only changes when an incident is
      // published, but the build is a wall-clock snapshot of that set.
      //
      // One hour is also the honest bound on how late this file can be after the
      // publish instant: `s-maxage` is the edge's cache, and `revalidatePath` from
      // the cron does not reach it, so a consumer polling in the first hour after
      // the publish minute can be served the previous list. That matches the worst
      // case of the pages' own revalidation window rather than exceeding it, and
      // the alternative — `no-store` — would mean a fetcher of last resort costing
      // an invocation per request. Worth remembering if the lag ever matters more
      // than the invocations do.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

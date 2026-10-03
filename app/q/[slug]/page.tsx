import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIncident,
  publishedIncidents,
  topicMeta,
} from "@/lib/incidents";
import { buildIncidentSEOPage } from "@/lib/seo/pages";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, incidentSchema } from "@/lib/seo/schema";
import { getRelatedIncidents } from "@/lib/seo/related";
import {
  Constraints,
  Evidence,
  Question,
  Section,
  Symptom,
} from "@/components/question/incident";
import { RememberGate } from "@/components/question/remember-gate";
import { PredictionForm } from "@/components/question/prediction-form";
import { DiagnosisReveal } from "@/components/question/diagnosis-reveal";
import { RubricSelfCheck } from "@/components/question/rubric-self-check";
import { ScoreCard } from "@/components/question/score-card";
import { ResetAttempt } from "@/components/question/reset-attempt";
import { TagBadge, DifficultyBadge } from "@/components/ui/badge";
import { GhostLink } from "@/components/ui/button";

/**
 * Prerender every incident that is already published; leave the scheduled ones
 * out.
 *
 * A slug that is not in this list is still reachable — `dynamicParams` defaults
 * to true, so the page renders on demand and `notFound()` decides — because a
 * post dated tomorrow is not in the *build's* list either, and setting
 * `dynamicParams = false` would 404 it until the next deploy, which is the one
 * thing a schedule cannot do.
 *
 * So the page renders twice over its life: once as a prerendered artifact at
 * build time if it was already live, and once on first request after its publish
 * instant if it was not. Both paths run the same `getIncident`, which is the
 * filter.
 */
export function generateStaticParams() {
  return publishedIncidents().map((incident) => ({ slug: incident.slug }));
}

/**
 * The hourly net under the publish cron — DESIGN.md section 8.6.
 *
 * The cron at `PUBLISH_CRON` is what actually flips the day; this is what
 * makes a missed cron cost an hour rather than lasting until the next deploy.
 * A literal, because Next statically analyses the value.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // `getIncident` is the published view, so an unpublished slug gets no title and
  // no description — a scheduled post must not be announced by its metadata.
  const incident = getIncident(slug);
  if (!incident) return {};
  // All title/description/canonical/OG/Twitter/robots rules live in the SEO
  // core; this route only names the entity.
  return buildMetadata(buildIncidentSEOPage(incident));
}

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // A slug that does not exist and a slug that is not published yet both land
  // here, and both 404. That is deliberate: a 404 for a scheduled incident is the
  // only answer that does not turn the archive into a preview of what is coming,
  // and it is also the answer the reader gets after the post goes out, so the two
  // states are indistinguishable from outside.
  const incident = getIncident(slug);
  if (!incident) notFound();

  const seoPage = buildIncidentSEOPage(incident);
  const related = getRelatedIncidents(incident);

  return (
    <div className="flex flex-col">
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-micro tracking-wider text-ink-3 uppercase">
        {seoPage.breadcrumbs.map((crumb, i) => (
          <span key={crumb.path}>
            {i > 0 ? <span aria-hidden> / </span> : null}
            {i === seoPage.breadcrumbs.length - 1 ? (
              <span aria-current="page" className="text-ink-2">{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className="hover:text-ink hover:underline underline-offset-4">{crumb.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <article className="flex flex-col gap-section">
        <header className="flex flex-col gap-item">
          <span className="flex flex-wrap items-center gap-item font-mono text-micro tracking-wider text-ink-3 uppercase">
            {/*
              The topic leads, and links to the hub for the area this post is
              filed under. Tags stay as badges: they are what the post is *about*,
              and the hub is where it is *shelved*.
            */}
            <Link
              href={`/topics/${incident.topic}`}
              className="underline-offset-4 hover:text-ink hover:underline"
            >
              {topicMeta(incident.topic).label}
            </Link>
            <span aria-hidden>&middot;</span>
            <time dateTime={incident.publishedAt} className="tabular-nums">
              {incident.publishedAt}
            </time>
            {incident.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            <DifficultyBadge level={incident.difficulty} />
          </span>
          <h1 className="font-display text-title font-medium text-ink text-balance">
            {incident.title}
          </h1>
        </header>

        <Symptom incident={incident} />
        <Constraints items={incident.constraints} />
        <Evidence items={incident.evidence} />

        <Section index="→" label="The question">
          <Question text={incident.question} />
        </Section>

        {/*
          The prediction/reveal/self-score flow (DESIGN.md section 8.2). Each piece
          subscribes to the same external attempt store rather than the page
          holding one piece of state, so a pick answer written in the form
          re-renders the reveal and the score without any of them knowing about
          the others.

          A returning reader with a submitted attempt lands straight here: the
          form renders their locked answers read-only, the diagnosis is already
          revealed, and the score card is showing. Nothing to redo.
        */}
        <PredictionForm incident={incident} />

        {/*
          A solid hairline used to separate the form from the diagnosis, and it is
          removed. Two reasons, and the second is the one that showed up on screen.

          It was the only solid divider on the page. Dashed is the only structural
          rule this design system has (section 6.1) — every item separator, the
          footer's terminator, the section boundaries — so this one line read as a
          different kind of boundary rather than the same kind.

          It was also the duplicate. With the reveal locked, the diagnosis renders
          nothing, so the hairline became the last element in the article and sat
          ~20px above the footer's own dashed rule. The page ended on two lines,
          one solid and one dashed, with only whitespace between them. Removing it
          leaves the dashed footer rule as the single terminator, and the diagnosis
          is still separated from the form by the article's 32px `gap-section` —
          the same whitespace that separates every other pair of sections.
        */}
        <DiagnosisReveal incident={incident} />

        <RubricSelfCheck incident={incident} />

        {/*
          The score is a result rather than one more section of the article, so
          it takes no index and no rule of its own — the 32px section gap above it
          and the footer's dashed divider below it already bracket it. Giving it a
          top border here would put 32px above the rule and 20px below, the exact
          asymmetry the footer was moved out of the article to avoid.
        */}
        <ScoreCard incident={incident} />

        {/*
          Last, after the score, so it reads as the conclusion rather than as
          another prompt. It takes no index: the score above took none for the same
          reason — these are the bookends of the article, and numbering one of them
          would put a `07` on the score and imply it belongs to the rubric.

          Gated through `RememberGate` because these closing lines are the
          incident's lesson written generally, and a lesson is still the answer.
        */}
        <RememberGate incident={incident} />

        {/*
          Last, after the bookends. It is the one control on the page whose effect
          is not local to where it sits — it clears the form, the reveal, the rubric
          and the score all at once — so it belongs after the conclusion, where a
          reader can see everything it is about to take away. Putting it inside
          `04 Your prediction` would mean scrolling back up to it after reading
          three screens, and putting it before the score would break the pairing
          those two sections have as the article's opening and closing beats.

          It takes no index for the same reason the score takes none: it is not a
          section of the incident, it is a control on the reader's attempt.
        */}
        <ResetAttempt incident={incident} />
      </article>

      {/*
        The footer sits outside the article so its dashed divider carries the same
        symmetric `--space-divider` above and below as every other page divider.
        Inside the article it would have inherited the 32px section gap on one side
        and 16px of its own padding on the other, which is the exact mismatch the
        spacing audit was asked to remove.
      */}
      <footer className="mt-divider border-t border-dashed border-line pt-divider">
        {related.length > 0 ? (
          <div className="flex flex-col gap-3 pb-divider">
            <h2 className="font-mono text-micro tracking-wider text-ink-3 uppercase">
              Related incidents
            </h2>
            <ul className="list-rows flex flex-col">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/q/${r.slug}`}
                    className="block truncate text-body font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <GhostLink href="/archive">Back to the archive</GhostLink>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape `<` so a `</script>` in content cannot end the block early.
          __html: JSON.stringify([incidentSchema(incident), breadcrumbSchema(seoPage.breadcrumbs)]).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}

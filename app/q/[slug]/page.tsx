import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIncident, incidents, topicMeta } from "@/lib/incidents";
import { ALTERNATE_TYPES } from "@/lib/metadata";
import {
  Constraints,
  Evidence,
  Question,
  Section,
  Symptom,
} from "@/components/question/incident";
import { PredictionForm } from "@/components/question/prediction-form";
import { DiagnosisReveal } from "@/components/question/diagnosis-reveal";
import { RubricSelfCheck } from "@/components/question/rubric-self-check";
import { ScoreCard } from "@/components/question/score-card";
import { TagBadge, DifficultyBadge } from "@/components/ui/badge";
import { GhostLink } from "@/components/ui/button";

/** All incidents are known at build time, so every route is prerendered. */
export function generateStaticParams() {
  return incidents.map((incident) => ({ slug: incident.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const incident = getIncident(slug);
  if (!incident) return {};
  return {
    // No brand suffix: the layout's `title.template` is the only place it is
    // written, and hardcoding it here as well meant an incident title was the
    // one page title still carrying its own copy.
    title: incident.title,
    description: incident.symptom,
    alternates: { canonical: `/q/${slug}`, types: ALTERNATE_TYPES },
  };
}

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const incident = getIncident(slug);
  if (!incident) notFound();

  return (
    <div className="flex flex-col">
      <article className="flex flex-col gap-section">
        <header className="flex flex-col gap-item">
          <span className="flex flex-wrap items-center gap-item font-mono text-micro tracking-wider text-ink-3 uppercase">
            {/*
              The topic leads, and links to the section this post is filed under.
              Tags stay as badges: they are what the post is *about*, and the
              section is where it is *shelved* — a reader who lands here should be
              one click from its neighbours without knowing the term for the
              problem.
            */}
            <Link
              href={`/topics#${incident.topic}`}
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

        <div className="h-px bg-line" />

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
      </article>

      {/*
        The footer sits outside the article so its dashed divider carries the same
        symmetric `--space-divider` above and below as every other page divider.
        Inside the article it would have inherited the 32px section gap on one side
        and 16px of its own padding on the other, which is the exact mismatch the
        spacing audit was asked to remove.
      */}
      <footer className="mt-divider border-t border-dashed border-line pt-divider">
        <GhostLink href="/archive">Back to the archive</GhostLink>
      </footer>
    </div>
  );
}

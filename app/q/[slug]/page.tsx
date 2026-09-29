import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIncident, incidents } from "@/lib/incidents";
import {
  Constraints,
  Diagnosis,
  Evidence,
  Fix,
  Question,
  Section,
  Symptom,
} from "@/components/question/incident";
import { Picks } from "@/components/question/picks";
import { Rubric } from "@/components/question/rubric";
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
    title: `${incident.title} — p99`,
    description: incident.symptom,
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
            <time dateTime={incident.publishedAt} className="tabular-nums">
              {incident.publishedAt}
            </time>
            <span aria-hidden>&middot;</span>
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

        <Picks picks={incident.picks} />

        <div className="h-px bg-line" />

        <Diagnosis text={incident.diagnosis} />
        <Fix text={incident.fix} />

        <Section index="06" label="Rubric">
          <Rubric rubric={incident.rubric} />
        </Section>
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

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
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="flex flex-wrap items-center gap-2 font-mono text-micro tracking-wider text-ink-3 uppercase">
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

      <footer className="border-t border-dashed border-line pt-4">
        <GhostLink href="/archive">Back to the archive</GhostLink>
      </footer>
    </article>
  );
}

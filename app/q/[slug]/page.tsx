import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bySlug, questions } from "@/lib/questions";
import {
  Constraints,
  Diagnosis,
  EvidenceBlocks,
  Fix,
  Prompt,
  Remember,
  Symptom,
} from "@/components/question/incident";
import { GhostLink } from "@/components/ui/button";

/** All incidents are known at build time, so every route is prerendered. */
export function generateStaticParams() {
  return questions.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const q = bySlug.get(slug);
  if (!q) return {};
  return { title: `${q.title} — p99`, description: q.description };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const q = bySlug.get(slug);
  if (!q) notFound();

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-micro tracking-wider text-ink-3 uppercase">
          {q.date} &middot; {q.topic} &middot; {q.difficulty}
        </span>
        <h1 className="font-display text-title font-medium text-ink text-balance">
          {q.title}
        </h1>
      </header>

      <Symptom question={q} />
      <Constraints constraints={q.constraints} />

      <div className="flex flex-col gap-2">
        <h2 className="flex items-baseline gap-2.5 font-mono text-micro tracking-wider text-ink-3 uppercase">
          <span className="tabular-nums">02</span>
          Evidence
        </h2>
        <EvidenceBlocks evidence={q.evidence} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="flex items-baseline gap-2.5 font-mono text-micro tracking-wider text-ink-3 uppercase">
          <span className="tabular-nums">→</span>
          The question
        </h2>
        <Prompt text={q.task} />
      </div>

      <div className="h-px bg-line" />

      <Diagnosis text={q.diagnosis} />
      <Fix text={q.fix} />

      <div className="flex flex-col gap-2">
        <h2 className="flex items-baseline gap-2.5 font-mono text-micro tracking-wider text-ink-3 uppercase">
          <span className="tabular-nums">05</span>
          Takeaways
        </h2>
        <Remember items={q.remember} />
      </div>

      <footer className="border-t border-dashed border-line pt-4">
        <GhostLink href="/archive">Back to the archive</GhostLink>
      </footer>
    </article>
  );
}

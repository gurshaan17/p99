import { recentQuestions, todaysQuestion } from "@/lib/questions";
import { ListRow } from "@/components/archive/list-row";
import { SectionHeader } from "@/components/archive/section-header";
import { GhostLink } from "@/components/ui/button";
import { Constraints, EvidenceBlocks, Symptom } from "@/components/question/incident";
import { Reveal } from "@/components/question/reveal";

/**
 * Today — DESIGN.md section 8.1.
 *
 * The featured incident is the page's only lead element; everything else is
 * quieter. No numbers, no score, no progress meter (section 8.1).
 */
export default function TodayPage() {
  const q = todaysQuestion;
  const recent = recentQuestions(4);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-micro tracking-wider text-ink-3 uppercase">
          {q.date} &middot; {q.topic} &middot; {q.difficulty}
        </span>
        <h1 className="font-display text-title font-medium text-ink text-balance">
          {q.title}
        </h1>
        <p className="max-w-(--measure-prose) text-lead text-ink-2 text-pretty">
          {q.description}
        </p>
      </header>

      <Symptom question={q} />
      <Constraints constraints={q.constraints} />
      <EvidenceBlocks evidence={q.evidence} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <GhostLink href={`/q/${q.slug}`}>Read the full write-up</GhostLink>
      </div>

      <Reveal question={q} />

      {recent.length > 0 ? (
        <section aria-labelledby="h-recent" className="flex flex-col gap-3">
          <SectionHeader
            index="→"
            title="Recent"
            description="Previously diagnosed."
          />
          <ul className="list-rows flex flex-col">
            {recent.map((r) => (
              <ListRow key={r.slug} question={r} />
            ))}
          </ul>
          <div>
            <GhostLink href="/archive">Browse the archive</GhostLink>
          </div>
        </section>
      ) : null}
    </div>
  );
}

import { recentIncidents, todaysIncident, topicMeta } from "@/lib/incidents";
import { ListRow } from "@/components/archive/list-row";
import { SectionHeader } from "@/components/archive/section-header";
import { GhostLink } from "@/components/ui/button";
import { Constraints, Evidence, Symptom } from "@/components/question/incident";
import { Reveal } from "@/components/question/reveal";

/**
 * Today — DESIGN.md section 8.1.
 *
 * The featured incident is the page's only lead element; everything else is
 * quieter. No numbers, no score, no progress meter (section 8.1).
 *
 * Today's incident is the most recently published one, so publishing a new file
 * under `content/incidents/` is what moves the site forward — there is no
 * separate "featured" flag to keep in sync.
 *
 * There is deliberately no lede paragraph under the title. An earlier version
 * rendered `symptom` in a `text-lead` lede *and* again in the `01 SYMPTOM`
 * section immediately below, so the same paragraph appeared twice in a row. The
 * numbered section owns that text; a summary field would be a second source for
 * it and would drift the moment an incident was edited in one place and not the
 * other. (DESIGN.md section 8.1 asks for one featured incident surface, not a
 * summary line.)
 */
export default function TodayPage() {
  const incident = todaysIncident;
  const recent = recentIncidents(4);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-micro tracking-wider text-ink-3 uppercase">
          {topicMeta(incident.topic).label} &middot;{" "}
          {incident.publishedAt} &middot; {incident.tags.join(" / ")} &middot;{" "}
          {incident.difficulty}
        </span>
        <h1 className="font-display text-title font-medium text-ink text-balance">
          {incident.title}
        </h1>
      </header>

      <Symptom incident={incident} />
      <Constraints items={incident.constraints} />
      <Evidence items={incident.evidence} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <GhostLink href={`/q/${incident.slug}`}>Read the full write-up</GhostLink>
      </div>

      <Reveal incident={incident} />

      {recent.length > 0 ? (
        <section aria-labelledby="h-recent" className="flex flex-col gap-3">
          <SectionHeader
            index="→"
            title="Recent"
            description="Previously diagnosed."
          />
          <ul className="list-rows flex flex-col">
            {recent.map((r) => (
              <ListRow key={r.slug} incident={r} />
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

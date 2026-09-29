import type { Metadata } from "next";
import { incidentsByTag, tagCounts } from "@/lib/incidents";
import { SectionHeader } from "@/components/archive/section-header";
import { ListRow } from "@/components/archive/list-row";

export const metadata: Metadata = {
  title: "Topics — p99",
  description: "Every incident, grouped by what actually broke.",
};

/**
 * Topics — DESIGN.md section 8.4.
 *
 * Anchor ids match `tagNav`'s hrefs (`/topics#caching`), so the sidebar's tag
 * links land on the right group. `scroll-mt` keeps the target clear of the
 * sticky topbar.
 *
 * This is a cross-index, not a partition: an incident appears under every tag it
 * carries, so the same incident shows up under both `postgres` and `autovacuum`.
 * `tagCounts` is already derived from content, so no hand-maintained tag list
 * exists anywhere in this page.
 */
export default function TopicsPage() {
  return (
    <div className="flex flex-col gap-block">
      <SectionHeader
        index="01"
        title="Topics"
        description="Grouped by what broke, not by which tool it happened in."
      />

      {tagCounts.map(({ tag, count }) => {
        const items = incidentsByTag(tag);
        return (
          <section
            key={tag}
            id={tag}
            aria-labelledby={`h-${tag}`}
            className="flex scroll-mt-16 flex-col gap-2"
          >
            <div className="flex items-baseline gap-2.5">
              <h2
                id={`h-${tag}`}
                className="font-display text-lead font-medium text-ink capitalize"
              >
                {tag}
              </h2>
              <span className="font-mono text-micro text-ink-3 tabular-nums">
                {count}
              </span>
            </div>
            <ul className="list-rows flex flex-col">
              {items.map((incident) => (
                <ListRow key={incident.slug} incident={incident} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

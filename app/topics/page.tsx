import type { Metadata } from "next";
import { questions, topicCounts, TOPICS } from "@/lib/questions";
import { SectionHeader } from "@/components/archive/section-header";
import { ListRow } from "@/components/archive/list-row";

export const metadata: Metadata = {
  title: "Topics — p99",
  description: "Every incident, grouped by what actually broke.",
};

/**
 * Topics — DESIGN.md section 8.4.
 *
 * Anchor ids match `topicNav`'s hrefs (`/topics#caching`), so the sidebar's
 * section links land on the right group. `scroll-mt` keeps the target clear of
 * the sticky topbar.
 */
export default function TopicsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="01"
        title="Topics"
        description="Grouped by what broke, not by which tool it happened in."
      />

      {TOPICS.filter((t) => topicCounts.some((c) => c.topic === t)).map(
        (topic) => {
          const items = questions.filter((q) => q.topic === topic);
          return (
            <section
              key={topic}
              id={topic.toLowerCase()}
              aria-labelledby={`h-${topic.toLowerCase()}`}
              className="flex scroll-mt-16 flex-col gap-2"
            >
              <div className="flex items-baseline gap-2.5">
                <h2
                  id={`h-${topic.toLowerCase()}`}
                  className="font-display text-lead font-medium text-ink"
                >
                  {topic}
                </h2>
                <span className="font-mono text-micro text-ink-3 tabular-nums">
                  {items.length}
                </span>
              </div>
              <ul className="list-rows flex flex-col">
                {items.map((q) => (
                  <ListRow key={q.slug} question={q} />
                ))}
              </ul>
            </section>
          );
        },
      )}
    </div>
  );
}

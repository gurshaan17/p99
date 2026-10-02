import type { Metadata } from "next";
import { incidentsByTopic, topicCounts } from "@/lib/incidents";
import { ALTERNATE_TYPES, OPEN_GRAPH } from "@/lib/metadata";
import { SectionHeader } from "@/components/archive/section-header";
import { ListRow } from "@/components/archive/list-row";

export const metadata: Metadata = {
  title: "Topics",
  description: "Every incident, grouped by what actually broke.",
  alternates: { canonical: "/topics", types: ALTERNATE_TYPES },
  openGraph: { ...OPEN_GRAPH, url: "/topics" },
};

/**
 * ISR, hourly — DESIGN.md section 8.6. Same net as `/archive` and `/q/[slug]`:
 * the publish cron revalidates the layout, and this bounds what a missed cron
 * costs.
 */
export const revalidate = 3600;

/**
 * Topics — DESIGN.md section 8.4.
 *
 * Anchor ids match `topicNav`'s hrefs (`/topics#databases`), so the sidebar's
 * section links land on the right group. `scroll-mt` keeps the target clear of
 * the sticky topbar.
 *
 * This is a partition, not a cross-index. Every incident carries exactly one
 * `topic` and appears under exactly that heading — a post filed twice reads as
 * padding. Fine-grained `tags` stay available as the archive filter; they are
 * not navigation, and a section per tag gave a dozen shelves holding one
 * incident each.
 *
 * `topicCounts` supplies the order, the counts, and the suppression of areas
 * with nothing in them, so the headings cannot drift from the content. Both it
 * and `incidentsByTopic` are filtered to the published set, so this page cannot
 * show a section for a topic whose only incident is scheduled.
 */

export default function TopicsPage() {
  return (
    <div className="flex flex-col gap-block">
      {/*
        No index on the page title, so the sections below number themselves from
        01. Leaving the title as 01 and starting the sections at 02 — the shape
        every other page uses — would have left this one opening on "02 Caching".
      */}
      <SectionHeader
        title="Topics"
        description="Grouped by what broke, not by which tool it happened in."
      />

      {topicCounts.map(({ id, label, description, count }, i) => {
        const items = incidentsByTopic(id);
        return (
          <section
            key={id}
            id={id}
            aria-labelledby={`h-${id}`}
            className="flex scroll-mt-16 flex-col gap-2"
          >
            <SectionHeader
              index={String(i + 1).padStart(2, "0")}
              title={label}
              description={description}
              count={count}
            />

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

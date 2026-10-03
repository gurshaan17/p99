import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TOPICS,
  incidentsByTopic,
  topicMeta,
} from "@/lib/incidents";
import { buildTopicSEOPage } from "@/lib/seo/pages";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, topicSchema } from "@/lib/seo/schema";
import { getRelatedTopics } from "@/lib/seo/related";
import { ListRow } from "@/components/archive/list-row";
import { SectionHeader } from "@/components/archive/section-header";
import type { Topic } from "@/lib/incidents";

/**
 * One hub per curated topic — DESIGN.md 8.4's partition, one page per shelf.
 *
 * The hub earns its index entry from substance: a unique H1 and the curated
 * topic description, the incident listing, related topics, breadcrumbs, and
 * CollectionPage/BreadcrumbList schema. Below the quality bar (fewer than the
 * configured minimum incidents) the page still renders for navigation, but
 * `noindex` — a one-incident hub is a duplicate of that incident.
 */

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ topic: topic.id }));
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  if (!TOPICS.some((t) => t.id === topic)) return {};
  return buildMetadata(buildTopicSEOPage(topic as Topic));
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (!TOPICS.some((t) => t.id === topic)) notFound();

  const meta = topicMeta(topic as Topic);
  const incidents = incidentsByTopic(topic as Topic);
  const relatedTopics = getRelatedTopics(topic as Topic);
  const page = buildTopicSEOPage(topic as Topic);

  return (
    <div className="flex flex-col gap-block">
      <nav aria-label="Breadcrumb" className="font-mono text-micro tracking-wider text-ink-3 uppercase">
        {page.breadcrumbs.map((crumb, i) => (
          <span key={crumb.path}>
            {i > 0 ? <span aria-hidden> / </span> : null}
            {i === page.breadcrumbs.length - 1 ? (
              <span aria-current="page" className="text-ink-2">{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className="hover:text-ink hover:underline underline-offset-4">{crumb.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <SectionHeader
        index="01"
        title={meta.label}
        description={meta.description}
        count={incidents.length}
      />

      <p className="text-body text-ink-2 text-pretty">
        Every {meta.label.toLowerCase()} incident p99 has published — what
        broke, what the operator was told, and the fix that held.
      </p>

      <section aria-labelledby="h-incidents" className="flex flex-col gap-2">
        <SectionHeader index="02" title="Incidents" count={incidents.length} />
        <ul className="list-rows flex flex-col">
          {incidents.map((incident) => (
            <ListRow key={incident.slug} incident={incident} />
          ))}
        </ul>
      </section>

      {relatedTopics.length > 0 ? (
        <section aria-labelledby="h-related-topics" className="flex flex-col gap-2">
          <SectionHeader index="→" title="Related topics" />
          <ul className="flex flex-wrap gap-2">
            {relatedTopics.map((id) => (
              <li key={id}>
                <Link href={`/topics/${id}`} className="text-body text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                  {topicMeta(id).label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([topicSchema(topic as Topic, incidents), breadcrumbSchema(page.breadcrumbs)]).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}

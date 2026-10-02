import type { Metadata } from "next";
import { publishedIncidents } from "@/lib/incidents";
import { ALTERNATE_TYPES, OPEN_GRAPH } from "@/lib/metadata";
import { ArchiveView } from "@/components/archive/archive-view";
import { SectionHeader } from "@/components/archive/section-header";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every incident, in reverse chronological order.",
  alternates: { canonical: "/archive", types: ALTERNATE_TYPES },
  openGraph: { ...OPEN_GRAPH, url: "/archive" },
};

/**
 * ISR, and the count has to be the published one — DESIGN.md section 8.6.
 *
 * `publishedIncidents()` rather than the registry: this page is the largest
 * single payload on the site, so a scheduled incident reaching it would ship its
 * title, symptom, diagnosis and fix to every reader as page data, before its
 * publish instant. The same list feeds the count in the header, so the two cannot
 * disagree. The cron revalidates the layout at `PUBLISH_CRON`; this is the
 * hourly net under it.
 */
export const revalidate = 3600;

export default function ArchivePage() {
  const incidents = publishedIncidents();

  return (
    <div className="flex flex-col gap-block">
      <SectionHeader
        index="01"
        title="Archive"
        description={`${incidents.length} incidents, newest first.`}
      />
      <ArchiveView incidents={incidents} />
    </div>
  );
}

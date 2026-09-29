import type { Metadata } from "next";
import { incidents } from "@/lib/incidents";
import { OPEN_GRAPH } from "@/lib/metadata";
import { ArchiveView } from "@/components/archive/archive-view";
import { SectionHeader } from "@/components/archive/section-header";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every incident, in reverse chronological order.",
  alternates: { canonical: "/archive" },
  openGraph: { ...OPEN_GRAPH, url: "/archive" },
};

export default function ArchivePage() {
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

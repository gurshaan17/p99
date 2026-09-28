import type { Metadata } from "next";
import { byDateDesc } from "@/lib/questions";
import { ArchiveView } from "@/components/archive/archive-view";
import { SectionHeader } from "@/components/archive/section-header";

export const metadata: Metadata = {
  title: "Archive — p99",
  description: "Every incident, in reverse chronological order.",
};

export default function ArchivePage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="01"
        title="Archive"
        description={`${byDateDesc.length} incidents, newest first.`}
      />
      <ArchiveView questions={byDateDesc} />
    </div>
  );
}

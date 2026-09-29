import type { Metadata } from "next";
import {
  diagnosedDays,
  streakGrid,
  streakWeeks,
  totalIncidents,
} from "@/lib/incidents";
import { SectionHeader } from "@/components/archive/section-header";
import { StreakRecord } from "@/components/archive/streak-record";

export const metadata: Metadata = {
  title: "Streak — p99",
  description: "Every day you diagnosed something instead of guessing.",
};

const TONE = {
  done: "bg-accent-ink",
  missed: "bg-line-strong",
  empty: "bg-transparent ring-1 ring-line ring-inset",
} as const;

export default function StreakPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="01"
        title="Streak"
        description={`${diagnosedDays} of ${totalIncidents} incidents diagnosed.`}
      />

      <div className="overflow-x-auto">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label={`Contribution grid: ${diagnosedDays} days with a published incident, over the last ${streakWeeks} weeks.`}
        >
          {streakGrid.flat().map((tone, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-hairline ${TONE[tone]}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 font-mono text-micro text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-hairline bg-accent-ink" /> diagnosed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-hairline bg-line-strong" /> missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-hairline ring-1 ring-line ring-inset" />{" "}
          ahead
        </span>
      </div>

      {/*
        The reader's own record. A client island rather than a second copy of this
        page as a client component, so `metadata` and the published-date grid above
        stay server-rendered and the page keeps working with storage disabled.
      */}
      <div className="mt-divider border-t border-dashed border-line pt-divider">
        <SectionHeader
          index="02"
          title="Your record"
          description="Counted from the self-checks you have submitted in this browser."
        />
        <StreakRecord />
      </div>
    </div>
  );
}

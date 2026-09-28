import type { Metadata } from "next";
import { questions, streakGrid, streakWeeks } from "@/lib/questions";
import { SectionHeader } from "@/components/archive/section-header";

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
  const completed = questions.filter((q) => q.done).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="01"
        title="Streak"
        description={`${completed} of ${questions.length} incidents diagnosed.`}
      />

      <div className="overflow-x-auto">
        <div
          className="grid w-max grid-flow-col gap-1"
          style={{ gridTemplateRows: "repeat(7, 0.625rem)" }}
          role="img"
          aria-label={`Contribution grid: ${completed} days completed over the last ${streakWeeks} weeks.`}
        >
          {streakGrid.flat().map((tone, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-[1px] ${TONE[tone]}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 font-mono text-micro text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[1px] bg-accent-ink" /> diagnosed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[1px] bg-line-strong" /> missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[1px] ring-1 ring-line ring-inset" />{" "}
          ahead
        </span>
      </div>
    </div>
  );
}

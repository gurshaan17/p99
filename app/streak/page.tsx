import type { Metadata } from "next";
import {
  diagnosedDays,
  streakFrom,
  streakGrid,
  streakTo,
  streakWeeks,
  totalIncidents,
} from "@/lib/incidents";
import { SectionHeader } from "@/components/archive/section-header";
import { StreakRecord } from "@/components/archive/streak-record";
import { ALTERNATE_TYPES, OPEN_GRAPH } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Streak",
  description: "Every day you diagnosed something instead of guessing.",
  alternates: { canonical: "/streak", types: ALTERNATE_TYPES },
  openGraph: { ...OPEN_GRAPH, url: "/streak" },
};

/**
 * The grid reads the wall clock so a run can visibly break; without a rebuild a
 * day that published nothing would never appear. ISR is the price of that, and it
 * is a literal because Next has to statically analyse it.
 *
 * Hourly rather than daily: the same window as every other incident page, so
 * there is one revalidation rule on the site instead of two. The publish cron
 * revalidates this at `PUBLISH_CRON` anyway, so in the ordinary case the grid
 * turns over on the same minute the post does.
 */
export const revalidate = 3600;

const TONE = {
  done: "bg-accent-ink",
  missed: "bg-line-strong",
  none: "bg-transparent ring-1 ring-line ring-inset",
} as const;

/**
 * Fixed locale and time zone so the label is identical wherever the page is
 * built. The keys are UTC publish-day keys, so they are read back as UTC rather
 * than being re-read in the build machine's timezone — a local parse would put
 * the west-coast window a day early.
 */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function describeWindow(): string {
  return `${DAY.format(new Date(streakFrom))} to ${DAY.format(
    new Date(streakTo),
  )}`;
}

export default function StreakPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        index="01"
        title="Streak"
        description={`${diagnosedDays} of ${totalIncidents} incidents diagnosed.`}
      />

      {streakWeeks === 0 ? (
        <p className="text-body text-ink-2 text-pretty">
          No incidents are published yet, so there is nothing to plot. The first
          one to go out starts the grid.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div
              className="grid w-max grid-flow-col grid-rows-7 gap-1"
              role="img"
              aria-label={`Contribution grid: ${diagnosedDays} days with a published incident, over the ${streakWeeks} weeks from ${describeWindow()}, Monday to Sunday. Cells before the first incident and after today are empty.`}
            >
              {streakGrid.flat().map((tone, i) => (
                <span
                  key={i}
                  className={`size-2.5 rounded-hairline ${TONE[tone]}`}
                />
              ))}
            </div>
          </div>

          {/*
            Two entries, not three. The ringed cell is `none` — before the site
            existed, or later than today — and a "missed" label on it was a lie
            about days that had not failed at anything. It is not in the legend
            because it is an absence rather than a value, and the aria-label
            says what it covers.
          */}
          <div className="flex items-center gap-4 font-mono text-micro text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-hairline bg-accent-ink" />{" "}
              diagnosed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-hairline bg-line-strong" /> missed
            </span>
          </div>
        </>
      )}

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

import type { Incident } from "./types";

export const dstSpringForwardSkippedJobs = {
  slug: "dst-spring-forward-skipped-jobs",
  title: "The nightly job had run for three years. One Sunday in March it didn't, and nothing failed.",
  publishedAt: "2026-10-10",
  difficulty: "medium",
  topic: "platform",
  tags: ["cron", "dst", "timezones", "scheduler", "missed-runs", "monitoring"],
  symptom:
    "On Monday, March 9, at 09:40, a partner's finance team emails you. Their reconciliation shows settlement files for March 6 and March 8, and nothing for March 7. Your dashboards are green. The scheduler has had 100% uptime, job history shows no failed runs, and nobody was paged over the weekend. You look at Sunday's run history and find the settlement job isn't listed as failed. It isn't listed at all.",
  constraints: [
    "Scheduler servers run in UTC; schedules are written in America/New_York local time",
    "The schedules were moved from UTC to local time in January, so reports \"line up with the business day\"",
    "Jobs, in local time: report-rollup at 01:30, stale-session-cleanup at 02:00, settlement-export at 02:30, partner-sync at 02:45",
    "Each job takes no arguments, and settlement-export exports \"yesterday\" relative to when it runs; Sunday's 02:30 run is supposed to export Saturday",
    "Monitoring alerts on a run that fails or exceeds 30 minutes; failed runs retry 3 times",
    "Nothing records which runs were expected",
  ],
  evidence: [
    "Sunday's run history shows report-rollup at 01:30, then nothing until the 03:00 hourly health ping",
    "All three jobs scheduled between 02:00 and 02:59 local are missing from Sunday; jobs at 01:30 and at 03:00 or later all ran",
    "Every other night, all three jobs ran on time, including Monday morning",
    "Scheduler uptime is 41 days, with no restarts and no errors in its log that night; server clocks are in sync",
    "The scheduler's \"next runs\" list the evening before shows 01:30 and then 03:00, with no 02:xx entries",
    "The same jobs ran on the equivalent Sunday last year, when they were scheduled in UTC",
    "The partner has no Saturday file, but it does have Sunday's, which Monday's run produced",
  ],
  question:
    "Why did exactly those three jobs vanish without a trace, why did nothing alert, and what would you change so that neither this Sunday nor the November one hurts you?",
  picks: [
    {
      id: "why-skipped",
      prompt: "Why did exactly those three jobs not run?",
      options: [
        { id: "crashed", label: "The scheduler crashed and restarted at 02:00" },
        {
          id: "nonexistent-hour",
          label:
            "Their local fire times fall between 02:00 and 02:59, an hour that doesn't exist on the spring-forward day, so the scheduler never produced a run for them",
        },
        { id: "clock-drift", label: "The servers' clocks drifted by an hour" },
        { id: "mutual-cancel", label: "Jobs scheduled within an hour of each other cancel one another" },
      ],
      answer: "nonexistent-hour",
    },
    {
      id: "why-silent",
      prompt: "Why was nobody alerted?",
      options: [
        { id: "muted-weekends", label: "Alerts are muted on weekends" },
        { id: "suppressed", label: "The scheduler suppresses its own errors" },
        { id: "auto-retried", label: "Missed runs were retried automatically" },
        {
          id: "monitoring-only-started-runs",
          label:
            "Monitoring only evaluates runs that started; a run that never begins can't fail, time out, or trigger an alert",
        },
      ],
      answer: "monitoring-only-started-runs",
    },
    {
      id: "long-term-fix",
      prompt: "What is the right long-term fix?",
      options: [
        {
          id: "utc-and-explicit-date",
          label:
            "Schedule system jobs in UTC unless there's a real business reason for local time; where local time is needed, give jobs an explicit business-date parameter and alert on expected runs that don't happen",
        },
        { id: "move-to-4am", label: "Move everything to 04:00 local and forget about it" },
        { id: "raise-retries", label: "Raise the retry count" },
        { id: "restart-before-dst", label: "Restart the scheduler before each DST change" },
      ],
      answer: "utc-and-explicit-date",
    },
  ],
  diagnosis: `On March 8, local clocks in New York went from 02:00 straight to 03:00, so any schedule at a local time between 02:00 and 02:59 doesn't exist that day. The scheduler, which evaluates schedules in local time, never produced a fire time for those three jobs and moved on. Moving the schedules from UTC to local time in January created a once-a-year failure that didn't exist before, which is why last year's run was fine.

There was no alert because the monitoring checks results, not expectations. A job that doesn't start leaves no run to fail, time out, or retry, so the silence looked identical to "nothing to report." The scheduler's own health was fine, and its "next runs" view even showed the gap the evening before — but nothing compared that view against what should have been there.

Monday's rerun needs care: settlement-export exports "yesterday" relative to its run time, so running it with defaults would produce Sunday's data a second time and leave Saturday's gap in place. The missing business date has to be passed in, which is also why jobs should take their business date as input.

A related trap is windows computed as "start plus 24 hours." On March 8 the local day is 23 hours long, so an arithmetic window drifts by an hour.`,
  fix: `The immediate fix is a manual backfill: run settlement-export for the missing business date (March 7) with that date passed explicitly, after confirming a rerun is safe, then check whether report-rollup and stale-session-cleanup also needed to run for that day. Tell the partner once the March 7 file exists.

The durable fixes:

| Fix | Tradeoff |
| --- | --- |
| Schedule system jobs in UTC by default | Reports no longer line up with local office hours twice a year, though the jobs themselves are stable |
| Jobs take an explicit business-date parameter | Slightly more orchestration code, but reruns and backfills become safe |
| Alert on expected-but-missing runs (a dead-man's switch) | Needs a source of truth for what was expected, such as heartbeats from each job |
| Avoid scheduling inside the 01:00-03:00 local window | Cheap, but only a workaround, and it doesn't protect new jobs |
| Idempotency keyed by business date | Handles the November double-run, and requires the job's outputs to be safely repeatable |
`,
  rubric: [
    {
      text: "Explained the spring-forward gap: local fire times inside the 02:00-02:59 hour never produced a run",
      dim: "correctness",
    },
    {
      text: "Named the monitoring blind spot — result-based alerts can't see a run that never started — and the November double-run risk for 01:30",
      dim: "process",
    },
    {
      text: "Carried the lesson to UTC-by-default scheduling, explicit business-date parameters, idempotent reruns, and a dead-man's switch",
      dim: "depth",
    },
  ],
  remember: [
    "A local time between 02:00 and 02:59 does not exist on the spring-forward day; a schedule written in local time can silently vanish.",
    "Monitoring that watches outcomes cannot see a run that never began. Alert on expected runs missing, not only on runs that failed.",
    "Give every job its business date as input. A job that infers the date from wall-clock time is unsafe to rerun, which is exactly when you need it.",
  ],
} satisfies Incident;

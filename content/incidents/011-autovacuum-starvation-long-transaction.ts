import type { Incident } from "./types";

export const autovacuumStarvationLongTransaction = {
  slug: "autovacuum-starvation-long-transaction",
  title:
    "No deploy. No traffic change. Queries just keep getting slower, day over day.",
  publishedAt: "2026-09-25",
  difficulty: "medium",
  topic: "databases",
  tags: ["postgres", "autovacuum", "bloat"],
  symptom:
    "A Postgres table with a heavy UPDATE/DELETE workload gets progressively slower over several days — not a sudden spike, a slow creep. No deploys, no traffic changes correlate.",
  constraints: [
    "Postgres, default autovacuum settings",
    "A nightly reporting job opens a transaction and holds it open for roughly an hour",
    "No idle_in_transaction_session_timeout configured",
    "Table has heavy write churn: frequent UPDATEs and DELETEs",
  ],
  evidence: [
    "pg_stat_user_tables shows n_dead_tup climbing continuously, with last_autovacuum not advancing on this table",
    "pg_stat_activity shows a long-lived transaction (matching the reporting job's schedule) with an old xmin",
    "pg_relation_size for the table is growing much faster than actual row count would explain",
    "Query latency degrades gradually over days, tracking the bloat growth, not a step-function change",
  ],
  question:
    "What's preventing autovacuum from doing its job, and how do you confirm it before restarting anything?",
  picks: [
    {
      id: "first-check",
      prompt: "What would you check first?",
      options: [
        { id: "restart-pg", label: "Restart Postgres and see if it helps" },
        {
          id: "pg-stat-activity",
          label: "pg_stat_activity for long-running or idle-in-transaction sessions",
        },
        { id: "add-indexes", label: "Add more indexes to speed up queries" },
        { id: "vacuum-full", label: "Run VACUUM FULL immediately" },
      ],
      answer: "pg-stat-activity",
    },
    {
      id: "root-cause",
      prompt: "What's the actual mechanism?",
      options: [
        { id: "disk-slow", label: "The underlying disk has gotten slower" },
        {
          id: "xmin-horizon",
          label: "A long-running transaction holds back the xmin horizon, preventing dead tuple cleanup",
        },
        { id: "index-corrupt", label: "Index corruption" },
        { id: "stats-stale", label: "Table statistics were never collected" },
      ],
      answer: "xmin-horizon",
    },
  ],
  diagnosis: `Postgres can't remove a dead tuple (from an UPDATE or DELETE) until no transaction in the system could still need to see the old version — this boundary is the xmin horizon. The nightly reporting job's hour-long open transaction holds the xmin horizon back for that entire hour, every day. Any row versions made dead during that window (and often longer, depending on autovacuum's own cycle timing) can't be reclaimed by autovacuum until the transaction finally commits.

On a table with heavy UPDATE/DELETE churn, this compounds daily: dead tuples accumulate faster than they're reclaimed, the table and its indexes bloat, sequential and index scans have more dead weight to skip over, and query planner statistics drift as live-to-dead tuple ratios shift. This produces exactly the gradual, day-over-day degradation observed — not a step change, because it's a slow accumulation, not a single event.`,
  fix: `- **Set \`idle_in_transaction_session_timeout\`** so open-but-idle transactions get terminated automatically rather than blocking vacuum indefinitely.
- **Fix the reporting job**: run it against a read replica, or restructure it to not hold a single transaction open for the full duration (e.g., use a consistent snapshot via \`REPEATABLE READ\` for a shorter window, or batch the work).
- **Monitor \`pg_stat_activity\` for long-running/idle-in-transaction sessions** proactively, not just when bloat is already visible.
- Once the blocking transaction is fixed, a manual \`VACUUM\` (not necessarily \`VACUUM FULL\`, which locks the table) reclaims the existing bloat.`,
  rubric: [
    {
      text: "Checked pg_stat_activity for long transactions before any DB-level fix",
      dim: "process",
    },
    {
      text: "Correctly identified the xmin horizon mechanism, not just 'vacuum is broken'",
      dim: "correctness",
    },
    {
      text: "Explained why the degradation is gradual rather than a step change",
      dim: "depth",
    },
    {
      text: "Proposed fixing the transaction, not just running VACUUM FULL as a one-off",
      dim: "depth",
    },
  ],
} satisfies Incident;

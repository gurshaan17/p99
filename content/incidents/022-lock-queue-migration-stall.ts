import type { Incident } from "./types";

export const lockQueueMigrationStall = {
  slug: "lock-queue-migration-stall",
  title: "A 30 ms migration took the orders table down for 17 minutes",
  publishedAt: "2026-10-07",
  difficulty: "medium",
  topic: "databases",
  tags: ["postgres", "locks", "migrations", "lock-queue", "lock-timeout"],
  symptom:
    "You run schema migrations automatically as the first step of every deploy. Today's migration adds one nullable column to orders with no default. On staging it finishes in 30 ms. In production, starting at 14:02:11, every endpoint that touches orders times out, while endpoints on users or catalog stay healthy. By 14:02:40 the app's connection pool is saturated. CPU is around 4%, IOPS flat, replication lag zero. On-call rolls back the deploy at 14:06, and nothing changes.",
  constraints: [
    "One PostgreSQL primary, about 2,400 requests per second, most of them touching orders",
    "Migrations run unattended as part of the deploy, with no lock_timeout or statement_timeout on the migration role",
    "The app pool has 200 connections with a 5-second wait before a request fails",
    "A read-only BI tool connects to the same primary and keeps sessions open",
    "Staging has no concurrent traffic",
  ],
  evidence: [
    "In pg_stat_activity, 192 of the 200 app connections are waiting on a lock on orders; the other 8 serve queries on other tables",
    "One session, the migration's ALTER TABLE orders, is itself waiting on a lock — it is not running",
    "One BI-role session is idle in transaction, idle for 52 minutes, its last statement a SELECT on orders",
    "Orders endpoints error within a second of the migration starting, with pool-timeout errors, not SQL errors",
    "Rolling back the application code had no effect; the migration session stayed where it was",
    "The same migration ran in 30 ms against staging",
  ],
  question:
    "Why does a metadata-only change take every query on the table with it, which session is the real problem, and what do you change so deploys can't do this?",
  picks: [
    {
      id: "why-stall",
      prompt: "Why did every query on orders stall?",
      options: [
        { id: "rewriting", label: "The migration was rewriting the whole table and holding its lock" },
        { id: "cpu", label: "The database was out of CPU" },
        { id: "deadlock", label: "A deadlock between the migration and the app" },
        {
          id: "lock-queue",
          label:
            "The migration needed an exclusive lock that an older transaction blocked, and new queries queued behind the waiting request instead of slipping past",
        },
      ],
      answer: "lock-queue",
    },
    {
      id: "root-cause",
      prompt: "Which session is the root cause of the pile-up?",
      options: [
        { id: "alter", label: "The ALTER TABLE, because it is the one marked waiting" },
        {
          id: "idle-bi",
          label: "The idle-in-transaction BI session, which has held its lock on orders since its earlier SELECT",
        },
        { id: "pool", label: "The app's connection pool" },
        { id: "replica", label: "The replica" },
      ],
      answer: "idle-bi",
    },
    {
      id: "prevent",
      prompt: "What change to the migration process prevents this class of outage?",
      options: [
        { id: "off-peak", label: "Only run migrations at 3 a.m." },
        { id: "staging-first", label: "Always test on staging first" },
        {
          id: "lock-timeout",
          label: "Set a short lock_timeout on the migration session and retry with backoff, so it fails fast instead of waiting in the lock queue",
        },
        { id: "bigger-pool", label: "Increase the pool wait timeout to 30 seconds" },
      ],
      answer: "lock-timeout",
    },
  ],
  diagnosis: `This is a lock-queue stall, not a slow migration. Adding a nullable column with no default takes an exclusive lock only briefly — the table is not rewritten. But that request cannot be granted while any older transaction holds even a read lock on the table, and while it waits, new queries on the table queue behind it instead of slipping past. The table goes dark even though the waiting statement is doing no work.

The chain: the BI session read from orders and then sat idle in transaction, keeping its lock. The migration queued behind it, and 192 application connections queued behind the migration. The pool filled, and pool-timeout errors followed. Staging passed because nothing there held an old transaction.

Rolling back the application code did nothing because the blocking happens inside the database, not in the code. The fastest safe mitigation is to cancel the waiting ALTER: the queue drains immediately and the migration can be retried later.`,
  fix: `Immediate mitigation is to cancel the waiting ALTER TABLE session; the lock queue drains and the table comes back. The migration can be retried once the BI session's lock is released.

The durable fixes:

| Fix | Tradeoff |
| --- | --- |
| Set a short lock_timeout plus retry with backoff on migrations | A migration may need several attempts, and the pipeline must handle repeated failure cleanly |
| Set idle_in_transaction_session_timeout for reporting roles, and alert on transactions open longer than a few minutes | The BI tool may break if it expects long-lived transactions; thresholds must not page for legitimate batch work |
| Route reporting to a replica | Replicas have their own conflict behavior, so this moves the problem rather than removing it |
| Run migrations off-peak | Fewer victims, but one old transaction is still enough to stall the table |
`,
  rubric: [
    {
      text: "Explained that the waiting migration blocked new queries because lock requests queue FIFO, not because it was doing work",
      dim: "correctness",
    },
    {
      text: "Traced the chain: idle BI transaction held the lock, the migration queued behind it, and the app pool queued behind the migration",
      dim: "process",
    },
    {
      text: "Identified lock_timeout with retry, idle-in-transaction timeouts, and alerting on long-open transactions as prevention",
      dim: "depth",
    },
  ],
  remember: [
    "A waiting DDL statement lets the whole table go dark: new queries queue behind it, even ones that could have slipped past.",
    "An idle-in-transaction session holds its locks; it is the real author of any downstream pile-up.",
    "Fail fast on lock waits during deploys. A short lock_timeout with backoff turns a table-wide outage into a retryable pipeline error.",
  ],
} satisfies Incident;

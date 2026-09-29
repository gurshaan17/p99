import type { Incident } from "./types";

export const noisyNeighborPoolStarvation = {
  slug: "noisy-neighbor-pool-starvation",
  title: "p50 is fine. p99 is 6 seconds. Every endpoint, not just the slow one.",
  publishedAt: "2026-09-28",
  difficulty: "medium",
  tags: ["postgres", "connection-pool", "multi-tenant"],
  symptom:
    "A multi-tenant API shares one Postgres connection pool (size 20) across all endpoints. Most queries run in under 10ms. But under load, p99 latency across EVERY endpoint — including trivial ones — balloons to seconds, while Postgres CPU stays low.",
  constraints: [
    "Single shared pool, 20 connections, no per-endpoint isolation",
    "One reporting endpoint runs a genuinely slow query (5-8s) for certain filter combinations, used by a handful of tenants",
    "No statement_timeout set on the pool",
    "Fast endpoints (simple key lookups) normally return in <10ms",
  ],
  evidence: [
    "Pool 'connections in use' metric pins at 20/20 for sustained periods during the slow windows",
    "Fast endpoints' own query execution time (measured inside the handler, after acquiring a connection) is still <10ms — the delay is entirely in pool acquisition wait time",
    "The slow report endpoint's traffic volume correlates exactly with the onset of the pool exhaustion windows",
    "Postgres server-side CPU and active query count stay low — it's not struggling to execute queries, connections just aren't available to hand out",
  ],
  question:
    "Why does a slow endpoint used by a few tenants degrade latency for every tenant on every endpoint?",
  picks: [
    {
      id: "bottleneck-location",
      prompt: "Where's the actual bottleneck?",
      options: [
        { id: "pg-cpu", label: "Postgres query execution is slow" },
        { id: "pool-acquire", label: "Waiting to acquire a pool connection" },
        { id: "network", label: "Network latency to Postgres" },
        { id: "app-cpu", label: "Application server CPU saturation" },
      ],
      answer: "pool-acquire",
    },
    {
      id: "diagnosis-first-step",
      prompt: "What would confirm this before changing any code?",
      options: [
        { id: "profile-cpu", label: "A CPU profile of the app process" },
        {
          id: "pool-wait-metric",
          label: "Pool wait-time / queue-depth metric, separate from query execution time",
        },
        { id: "pg-explain", label: "EXPLAIN ANALYZE on the fast queries" },
        { id: "restart", label: "Restart the app servers and see if it recurs" },
      ],
      answer: "pool-wait-metric",
    },
  ],
  diagnosis: `All 20 connections get occupied by concurrent slow report requests. Every other request — regardless of how fast its own query would be — has to wait in line for a connection to free up. This is head-of-line blocking at the pool level: the pool doesn't know or care that one waiting request needs 8ms and another needs 8s, it serves connections in acquisition order (or close to it).

The tell is the split between "time to execute the query" (fast, once a connection is held) and "time to acquire a connection from the pool" (slow, because all 20 are held by slow queries). Without a pool-level wait metric, this looks identical to "Postgres is just slow" from the outside — which is why Postgres CPU staying low is the critical clue that rules that out.`,
  fix: `- **Separate pools by query class**: give the reporting endpoint its own small pool (e.g., 3-5 connections) so it can never starve the pool serving fast/transactional traffic.
- **Set \`statement_timeout\`** on the reporting queries so a single bad filter combination can't hold a connection for 8 seconds unbounded.
- **Add per-endpoint concurrency limits** (e.g., a semaphore) so the reporting endpoint can't accept unlimited concurrent slow requests even within its own pool.
- Longer term: move reporting queries to a read replica entirely, so they can never contend with transactional traffic for the same connection budget.`,
  rubric: [
    {
      text: "Distinguished pool-acquisition wait from query execution time",
      dim: "correctness",
    },
    {
      text: "Used the 'Postgres CPU is low' signal to rule out DB-side slowness",
      dim: "process",
    },
    {
      text: "Identified head-of-line blocking as the general pattern, not just this instance",
      dim: "depth",
    },
    {
      text: "Proposed pool isolation, not just 'add more connections'",
      dim: "depth",
    },
  ],
} satisfies Incident;

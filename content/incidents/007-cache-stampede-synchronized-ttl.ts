import type { Incident } from "./types";

export const cacheStampedeSynchronizedTtl = {
  slug: "cache-stampede-synchronized-ttl",
  title: "98% cache hit rate → 40%, every 60 seconds, like clockwork",
  publishedAt: "2026-09-29",
  difficulty: "medium",
  topic: "caching",
  tags: ["redis", "caching", "postgres"],
  symptom:
    "Your API caches expensive aggregation results in Redis with a flat 60-second TTL. Every 60 seconds, in a tight window, Postgres CPU spikes and p99 latency jumps from 20ms to 2-4 seconds — then it recovers, until the next cycle.",
  constraints: [
    "Redis cache, fixed 60s TTL set uniformly by a nightly batch job that warms the top 500 keys all within the same few seconds",
    "No request coalescing — each cache miss triggers its own DB query",
    "Traffic is steady, ~800 req/s, no deploys correlate with the spikes",
    "Postgres is otherwise healthy: <20% CPU outside these windows",
  ],
  evidence: [
    "Redis hit rate graph is a sawtooth: 98% → 40% → 98%, period exactly 60s",
    "Postgres query count graph spikes in the same windows, same queries repeated hundreds of times concurrently for the same cache keys",
    "APM shows dozens of identical in-flight queries for the same aggregation, same parameters, all started within milliseconds of each other",
  ],
  question:
    "What's causing the periodic spike, and why does it recur precisely every 60 seconds instead of randomly?",
  picks: [
    {
      id: "root-cause",
      prompt: "What's the root cause?",
      options: [
        { id: "db-slow", label: "Postgres query itself is too slow" },
        {
          id: "stampede",
          label: "Synchronized cache expiry causing a stampede",
        },
        { id: "redis-oom", label: "Redis is evicting keys under memory pressure" },
        { id: "network", label: "Network latency between app and Redis" },
      ],
      answer: "stampede",
    },
    {
      id: "fix-approach",
      prompt: "Which fix addresses the root cause, not just the symptom?",
      options: [
        { id: "bigger-redis", label: "Scale up the Redis instance" },
        { id: "jitter", label: "Add jitter to TTLs plus request coalescing" },
        { id: "shorter-ttl", label: "Shorten the TTL to reduce staleness" },
        { id: "bigger-pg", label: "Add more Postgres read replicas" },
      ],
      answer: "jitter",
    },
  ],
  diagnosis: `All keys were set within the same few-second window by the batch job, so they all expire within the same window too. When a popular key expires, every concurrent request for it misses the cache and hits Postgres independently — there's no coordination between requests to say "someone's already fetching this, wait for them." With 500 keys expiring in the same burst and hundreds of req/s, you get hundreds of duplicate queries for the same few results, all at once.

This confirms as a stampede rather than genuine load: the query count spike is duplicate work, not new work — the same aggregation, run hundreds of times, for a result that's about to be identical for every caller.`,
  fix: `Two independent fixes, best used together:

1. **Jittered TTL**: instead of a flat 60s, use \`60 + random(0, 15)\` seconds per key. This desynchronizes expiry across keys so they no longer all miss at once.
2. **Request coalescing (single-flight)**: when a cache miss occurs, the first request acquires a short-lived lock (e.g., \`SET key:lock NX EX 5\`) and regenerates the value; concurrent requests for the same key wait briefly and read the freshly-set cache instead of each hitting Postgres.

A stale-while-revalidate pattern (serve the expired value while one request refreshes it in the background) removes the latency spike entirely, at the cost of briefly serving stale data — worth it for most read-heavy aggregations.`,
  remember: [
    "A cache that is 98% effective can still be the whole outage. Hit rate describes the average; the stampede is a distribution question, and averages hide it.",
    "Read every expiry together. Keys written in one batch expire in one batch, so a per-key TTL that looks randomised is synchronised if the writer is.",
    "Missing on a hot key is a different problem from a slow query. Fix the coordination, not the database — singleflight or a per-key lock is usually the whole fix.",
  ],
  rubric: [
    {
      text: "Explained that synchronized expiry, not the cache itself, is the trigger",
      dim: "correctness",
    },
    {
      text: "Noticed the periodicity (60s) as the key diagnostic signal",
      dim: "process",
    },
    {
      text: "Distinguished duplicate work from genuine new load",
      dim: "depth",
    },
    { text: "Proposed jitter AND coalescing, not just one", dim: "depth" },
  ],
} satisfies Incident;

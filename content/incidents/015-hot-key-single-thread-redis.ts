import type { Incident } from "./types";

export const hotKeySingleThreadRedis = {
  slug: "hot-key-single-thread-redis",
  title:
    "80% of reads hit one post ID. Redis pins at 100% and every key's p99 goes 1ms → 300ms. Then the TTL expires.",
  publishedAt: "2026-09-30",
  difficulty: "hard",
  topic: "caching",
  tags: ["redis", "caching", "hot-key", "thundering-herd", "postgres"],
  symptom:
    "A single Redis instance sits between 30 app servers and Postgres for 'get post by ID'. Traffic is normally evenly spread across millions of posts and Redis idles. A celebrity post goes viral; within minutes 80% of all reads target that one ID. Redis CPU hits 100% and p99 latency jumps from 1ms to 300ms — for every key, not just the viral one. A few minutes later the hot entry expires at peak traffic (flat 60s TTL) and Postgres CPU spikes to 100% in the same instant, causing a brief full outage.",
  constraints: [
    "One Redis instance, not clustered; 4 vCPUs; Redis is single-threaded for command execution (I/O threads, when enabled, only move bytes across sockets — every command still executes on the one main thread)",
    "Normal peak: 50,000 reads/sec, spread across ~10M distinct post IDs",
    "Viral spike: 200,000 reads/sec total, of which 160,000/sec for a single post ID",
    "Cache TTL is a flat 60s for all post entries — set by the same writer, so every expiry is synchronized with its own writes",
    "Postgres can sustain ~2,000 reads/sec comfortably before latency degrades",
    "30 app servers behind a load balancer; no internal coordination between them (no shared singleflight, no shared backfill lock)",
    "You cannot predict in advance which post will go viral",
    "The viral post exists in Redis (it was written normally and served with the rest until its reads exploded)",
  ],
  evidence: [
    "Redis command-rate graph during the spike: ~160K of the ~200K ops/sec are GET for the same key (same post ID); the other 40K are spread across the rest of the keyspace",
    "Redis CPU pinned at 100% the whole window, while memory is fine — no evictions, no OOM, no maxmemory activity",
    "Redis p99 is uniform across ALL keys during the spike: the slow requests are not the viral key — GETs for cold, unrelated, even nonexistent keys all share the same ~300ms tail",
    "The instant before the hot key's 60s TTL expires, Postgres CPU is steady (<10%); the second after it expires, Postgres CPU jumps to 100% and every app server logs the same SELECT for the same post ID starting within milliseconds of each other",
    "APM shows thousands of identical in-flight queries for the same post row, all started in the same second, no request coalescing anywhere in the stack",
  ],
  question:
    "Reads for one key at 160K/sec slow down requests for every other key in the same Redis — why, when Redis is otherwise 'fast enough' for the volume? And what exactly breaks in the seconds after that key's TTL hits zero?",
  picks: [
    {
      id: "unrelated-keys-cause",
      prompt: "Why do unrelated keys get slow?",
      options: [
        {
          id: "redis-cpu-throttle",
          label: "Redis pegged at 100% starts throttling connection handling only for hot keys",
        },
        {
          id: "network-saturation",
          label: "The viral post's reads saturate the network link into Redis, adding delay to everything sharing it",
        },
        {
          id: "single-thread-queue",
          label: "Redis runs all commands on one shared thread, so the hot key's burst queues every other key behind it",
        },
        {
          id: "per-key-queue",
          label: "Redis keeps a queue per key, so the hot key's own queue backs up and no other key is affected",
        },
      ],
      answer: "single-thread-queue",
    },
    {
      id: "expiry-seconds",
      prompt: "What happens in the seconds after the hot key's TTL expires?",
      options: [
        {
          id: "redis-repopulates",
          label: "The app servers coordinate through shared Redis, which regenerates the value once for all of them",
        },
        {
          id: "herd-to-postgres",
          label: "All 30 servers miss at once; each fires the same SELECT, ~160K duplicates into a Postgres built for ~2K",
        },
        {
          id: "first-request-wins",
          label: "Only the first app server to miss regenerates the value; the other 29 wait for it",
        },
        {
          id: "redis-relieves",
          label: "Redis stays saturated serving misses, so Postgres never actually sees the surge",
        },
      ],
      answer: "herd-to-postgres",
    },
    {
      id: "fix-location",
      prompt: "Is the fix about Redis, Postgres, or the request path between them?",
      options: [
        { id: "bigger-redis", label: "Redis capacity: scale to a larger instance so the queue has more headroom" },
        {
          id: "request-path",
          label: "The request path: per-server local cache plus coalescing keep hot reads off Redis and Postgres",
        },
        {
          id: "pg-replicas",
          label: "Postgres capacity: add read replicas to absorb the extra read load",
        },
        {
          id: "scale-both",
          label: "Both: scale Redis and add Postgres read replicas to cover the spike",
        },
      ],
      answer: "request-path",
    },
    {
      id: "replicas-vs-sharding",
      prompt: "Would adding more Redis replicas fix this? Would sharding?",
      options: [
        {
          id: "replicas-complete",
          label: "Read replicas add read throughput, but on their own they still miss together at expiry",
        },
        {
          id: "sharding-solves",
          label: "Sharding alone spreads a hot key's traffic evenly across all its shards for free",
        },
        {
          id: "partial-both",
          label: "Replicas share the TTL, so the stampede survives; sharding pins a hot key to one shard unless key-split",
        },
        {
          id: "bigger-primary",
          label: "Raising the primary's vCPUs handles the spike, since Redis puts all cores to work",
        },
      ],
      answer: "partial-both",
    },
    {
      id: "write-heavy-counter",
      prompt:
        "The viral post gets 160K LIKEs/min. How is a write-heavy hot key different from this read-heavy case?",
      options: [
        {
          id: "same-cache-tier",
          label: "The same local-cache tier from the read-heavy case works unchanged here",
        },
        {
          id: "shard-the-counter",
          label: "Every write mutates the value, so caching can't serve it; split the counter and sum on read",
        },
        {
          id: "redis-replicas",
          label: "Add replicas, which absorb write fan-in through incremental replication",
        },
        {
          id: "read-fanout",
          label: "Let all 30 app servers cache the counter locally and reconcile once a minute",
        },
      ],
      answer: "shard-the-counter",
    },
  ],
  diagnosis: `**One thread, one queue, every key in it.** Redis (reliably single-threaded for command execution since its design; I/O threads only touch socket I/O) processes commands one at a time in arrival order. You cannot inspect or route around that queue per key — there is exactly one of them, shared by all clients and all keys. The moment a single key contributes 160K of the 200K ops/sec the instance is receiving, that shared queue is what everyone waits in. Your 1ms cold-key GET arrives behind thousands of hot-key GETs already buffered, so its latency is "waiting time behind the hot key" + its own 1ms of service — which is why the p99 distribution is identical across every key. This is head-of-line blocking at the command queue. Four vCPUs don't help: only one executes commands, and until the queue drains, the other three mostly idle.

**Not memory, and not the key itself.** No evictions, no OOM: Redis is CPU-saturated, not memory-saturated. A single-threaded instance tops out around 100-200K trivial ops/sec, so 200K total (dominated by one key) sits right at the wall — and because execution is strictly serialized, even an occasional 50K burst on one key momentarily delays the cold-key commands behind it. The concentration, not the total, is what makes it visible.

**The expiry: a coordinated miss into a database 80x oversubscribed.** Every post entry shares a flat 60s TTL enforced by the single instance, so the viral key expires at exactly the same moment for all 30 app servers — there is one copy of the value and one clock. Each of the ~160K requests that second misses and independently runs \`SELECT … WHERE id = $1\`; no server knows another is already fetching. ~160,000 duplicate queries/sec into a Postgres built for ~2,000 is an 80x stampede: CPU pins, the pool exhausts, every endpoint on every server now waits on the pool (the exact signature of incident \`noisy-neighbor-pool-starvation\`), and timeouts seed retries that amplify the herd. The outage is brief only because the first stampeder's query completes and rewrites the key, re-populating Redis within seconds — which is precisely why the graph shows one hard jolt, not a flatline.

**The fix lives between the servers, not in them.** Scaling Redis postpones the same queue; scaling Postgres bakes in an 80x over-provision for work that is 100% duplicate. The request path is where the lever is: a small in-process cache in each app server turns the 160K reads for the viral post into ~5K/node memory hits, taking the key out of the shared Redis queue entirely (and making it effectively invisible to Postgres). On the residual cache miss, request coalescing — one in-flight regeneration per key per fleet, a short-\`EX\`-NX backfill lock in Redis, stale-while-revalidate behind it — caps the DB fan-in at a handful of queries no matter how hot the key becomes.`,
  fix: `- **Local cache tier in each app server.** A short-TTL (≈1-2s) in-process cache in front of Redis. It works for unpredictable hot keys without knowing which key will pop, because the key that is hot on the fleet is hot on each node — 160K reads/sec split across 30 servers is only ~5K reads/sec per process, which a memory hashtable serves without touching the shared queue. This is the single highest-leverage change for a read-heavy hot key.
- **Request coalescing on the miss path.** One regeneration per key at a time across the whole fleet: a Redis \`SET key:backfill NX EX 2\` lock, where the winner re-fetches and the rest either wait for the fresh value or read a stale copy. Postgres then sees O(1) query per expiry instead of O(160K).
- **Stale-while-revalidate.** Serve the previous value while one background request refreshes it, so a TTL expiry is invisible to the read path rather than a hard miss. Pair this with TTL jitter (60 + random(0, 15)s) so future keys are not synchronized around one clock the way this one was.
- **Hot-key detection for the un-predictable case.** You cannot pre-warm organic virality, so detect it instead: per-key command counters (a \`server-side\` counter, or a Keyspace-notification/access-log sampler) flag a key as hot past a rate threshold, and the app promotes it to the local tier and, if sharded, key-splits it automatically.
- **For a scheduled-hot key** (product launch, live event, an announced post), you get the one luxagation unpredictable virality does not: pre-warm it — write the value into every app server's local cache before traffic arrives, key-split it ahead of time, and pre-scale the tier that will serve it. Same mechanisms, started before rather than after.
- **Write-heavy hot keys are a different problem** (a like counter, an inventory decrement): local caching can't help because every write mutates the value, and the mutation still funnels through one key's single-threaded queue. Split the counter in key-space — \`post:ID:likes:0..N-1\`, increment a random/round-robin sub-key per write, sum the N on read — so the write fan-in spreads across keys and, in a cluster, across shard threads. Where even sub-keys get hot, buffer increments and flush in batches, or push the fact to a stream that aggregates asynchronously. Never try to fix a write-heavy hot key by adding read replicas: the primary still executes every mutation.`,
  remember: [
    "A single-threaded, shared command queue is global, not per key. One hot key makes every key hot, and no amount of Redis vertical scaling changes the fact that one queue serializes them all.",
    "A cache is only fast if the miss path is bounded. A flat TTL + many uncoordinated app servers converts one expiry into a tornado of identical queries; the outage is the coordinate miss, not the cache.",
    "For a hot key, cache in the requesting process — the local tier — and coalesce the regeneration. Scaling the cache or the database just prices in work you already decided was a duplicate.",
  ],
  rubric: [
    {
      text: "Identified head-of-line blocking at Redis's single-threaded command queue as the reason unrelated keys got slow",
      dim: "correctness",
    },
    {
      text: "Used the 'p99 uniform across all keys' and 'no evictions' evidence to rule out memory pressure and per-key isolation",
      dim: "process",
    },
    {
      text: "Explained the TTL expiry as a coordinated miss across 30 uncoordinated servers — not a random or minor event",
      dim: "correctness",
    },
    {
      text: "Located the fix in the request path (local cache tier + coalescing), not in Redis or Postgres capacity",
      dim: "depth",
    },
    {
      text: "Called out that replicas don't fix the stampede and sharding concentrates a hot key unless key-split",
      dim: "depth",
    },
    {
      text: "Separated the read-heavy (cache the value) from write-heavy (split the mutation) treatment",
      dim: "depth",
    },
  ],
} satisfies Incident;
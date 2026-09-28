/**
 * Content model for incidents — DESIGN.md section 8.2.
 *
 * Incident prose ships as structured data rather than MDX for the listing and
 * evidence surfaces; section 9's `.prose-site` wrapper styles the long-form
 * fields when they are rendered.
 */

export const TOPICS = [
  "Databases",
  "Networking",
  "Concurrency",
  "Caching",
  "Observability",
  "Queues",
] as const;

export type Topic = (typeof TOPICS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Constraint = { key: string; value: string };

export type Evidence =
  | { kind: "code"; language: string; body: string }
  | { kind: "log"; label: string; body: string }
  | { kind: "graph"; label: string; body: string };

export type Question = {
  slug: string;
  title: string;
  /** one-line symptom, used in list rows and the featured card */
  description: string;
  topic: Topic;
  difficulty: Difficulty;
  /** ISO date of publication */
  date: string;
  symptom: string;
  constraints: Constraint[];
  evidence: Evidence[];
  task: string;
  diagnosis: string;
  fix: string;
  remember: string[];
  /** true once a reader has completed the day (drives the streak grid) */
  done: boolean;
};

export const questions: Question[] = [
  {
    slug: "conn-pool-exhaustion",
    done: false,
    title: "Connection pool exhaustion after a deploy",
    description: "p99 climbs 40x while CPU sits idle; every pod looks healthy.",
    topic: "Databases",
    difficulty: "medium",
    date: "2026-09-28",
    symptom:
      "Immediately after a routine deploy, checkout p99 rose from 180ms to 7.2s. CPU, memory, and error rate were all flat, and no pod was restarting. Dashboards showed a clean rollout: all pods Ready, zero restarts, no error spikes.",
    constraints: [
      { key: "p99", value: "7.2s (was 180ms)" },
      { key: "p50", value: "190ms — unchanged" },
      { key: "CPU", value: "12% across all pods" },
      { key: "Restarts", value: "0" },
      { key: "Connections", value: "500/500 — pool at ceiling" },
    ],
    evidence: [
      {
        kind: "log",
        label: "checkout pod logs",
        body: `WARN  pool: wait queue depth 214
WARN  pool: acquire took 6802ms (timeout 5000ms)
INFO  deploy: 42d1a8f rollout complete, 0 restarts`,
      },
      {
        kind: "code",
        language: "sql",
        body: `-- pool sizing, unchanged across the deploy
checkout      max_connections = 50
cart          max_connections = 50
profile       max_connections = 50
recommendation max_connections = 50`,
      },
    ],
    task:
      "Latency exploded, but nothing in the deploy looks broken and the pool is at its ceiling rather than over it. What is actually holding the connections, and why did only p99 move?",
    diagnosis:
      "The deploy tripled the number of pods while each pod's pool stayed at 50 connections. Total demand went from 150 to 500 against a database ceiling of 500, leaving zero headroom for the recommendation service or any maintenance connection. Every request past the ceiling queues in the client pool, so a minority of requests wait seconds while the median sails through untouched — which is exactly why only p99 moved and CPU stayed flat. The pool was never over-subscribed; it was exactly full, so the queue drained at the rate of the slowest connection return rather than failing fast.",
    fix:
      "Right-size the total budget from the database ceiling, not from per-pod comfort: divide max_connections by the maximum pod count, and leave roughly 20% of the server budget unallocated. Then set a per-pod acquire timeout well below the request timeout so saturation surfaces as a fast, attributable error instead of a seven-second queue. Finally, gate rollouts on a connection-count metric, since pool saturation is invisible to CPU- and error-based health checks.",
    remember: [
      "A p99-only regression with a flat median almost always means queueing, not saturation of the work itself.",
      "Pool ceilings multiply by pod count. Changing replica count changes your connection budget without touching any connection setting.",
      "Readiness probes that check only CPU and liveness will happily pass a pod whose pool is fully drained.",
    ],
  },
  {
    slug: "retry-storm-amplification",
    done: true,
    title: "Retry storm amplifies a 200ms blip into an outage",
    description: "A 200ms upstream blip returns 6 minutes later as a 6-minute outage.",
    topic: "Networking",
    difficulty: "hard",
    date: "2026-09-27",
    symptom:
      "A third-party status page recorded a 200ms blip at 09:14. Our own incident ran from 09:14 to 09:20, timed out by customers at every region. The dependency recovered in under a second; we did not.",
    constraints: [
      { key: "Dependency blip", value: "200ms" },
      { key: "Our outage", value: "6m 04s" },
      { key: "Timeout", value: "1s" },
      { key: "Retries", value: "3, no backoff" },
      { key: "Requests", value: "12k/s" },
    ],
    evidence: [
      {
        kind: "code",
        language: "ts",
        body: `// the retry wrapper, unchanged for two years
async function callUpstream(req) {
  for (let i = 0; i < 3; i++) {
    try {
      return await withTimeout(req, 1000);
    } catch {
      // no backoff, no jitter, no circuit breaker
    }
  }
  throw new Error("upstream failed");
}`,
      },
      {
        kind: "log",
        label: "upstream request volume",
        body: `09:14:00   12k/s
09:14:01   41k/s   <- every client retrying in lockstep
09:14:05   38k/s
09:15:12   11k/s   <- upstream healthy again
09:15:13   52k/s   <- queues from the blip drain and re-saturate`,
      },
    ],
    task:
      "The dependency recovered after 200ms. Explain how the outage lasted six minutes, and which single change would have bounded it.",
    diagnosis:
      "Every client retried immediately and in lockstep, multiplying 12k requests per second into roughly 40k against a dependency that was already struggling. Those retries did not clear: each one re-queued a fresh request, so arrival rate stayed pinned at capacity while the dependency's own queues drained more slowly than they filled. The dependency recovered at 09:14:01, but the queue it had already accumulated took minutes to clear, and every queued request was a client that would retry again. The system never recovered because the work it owed was larger than the work it could retire — a self-sustaining backlog.",
    fix:
      "Add exponential backoff with full jitter so retries spread out instead of arriving as a synchronized wave, and cap total retry attempts against the request's own deadline rather than a fixed count. Add a circuit breaker so a saturated dependency fails fast for a cooling window instead of queueing indefinitely. Then bound concurrency on the calling side with a bulkhead, so one slow dependency cannot consume the capacity that other dependencies need.",
    remember: [
      "Retries without jitter convert a blip into a synchronized wave. Jitter matters more than backoff.",
      "A dependency recovering does not help if your own in-flight queue is larger than its drain rate.",
      "Retries must be bounded by the caller's deadline, not by a fixed attempt count.",
    ],
  },
  {
    slug: "stale-cache-after-failover",
    done: true,
    title: "Replica failover serves stale writes for six minutes",
    description: "Reads return pre-failover values while writes succeed normally.",
    topic: "Caching",
    difficulty: "medium",
    date: "2026-09-26",
    symptom:
      "During a routine primary failover, writes kept succeeding. Reads served values that were six minutes stale, and some customers reported seeing their own just-submitted orders vanish from the product page.",
    constraints: [
      { key: "Failover", value: "planned, 400ms" },
      { key: "Stale window", value: "6m 12s" },
      { key: "Cache TTL", value: "5m (sliding)" },
      { key: "Write path", value: "primary, healthy" },
      { key: "Read path", value: "replica, 4s behind" },
    ],
    evidence: [
      {
        kind: "code",
        language: "ts",
        body: `// sliding expiry: every read pushes the deadline forward
function cached(key, ttl) {
  const hit = store.get(key);
  if (hit) {
    store.expire(key, ttl);   // <-- resets on every hit
    return hit;
  }
}`,
      },
      {
        kind: "log",
        label: "replication lag",
        body: `09:02:11  primary demoted, replica promoted
09:02:11  lag 4000ms
09:08:23  lag 4ms
// popular key: 1.2k reads/min, so sliding TTL never expired`,
      },
    ],
    task:
      "Writes never failed and the new primary was correct within seconds. Why did reads serve stale data for six minutes?",
    diagnosis:
      "The cache used sliding expiry, so a key read more than once inside its TTL never expired. The failover took six minutes to fully drain, and the replica lagged four seconds behind the old primary throughout. A key read continuously during that window kept resetting its own deadline, so the cache held a pre-failover value past the point where the data it represented was no longer recoverable from any replica. The cache was not slow to invalidate; it was never invalidating, because the reads that would have triggered expiry were the reads that extended it.",
    fix:
      "Use absolute expiry for keys that mirror replicated state, so a hot key cannot extend its own staleness indefinitely. Shorten the TTL to below your worst-case replication lag rather than above typical lag, and accept more misses. On failover, explicitly purge keys for the affected write set rather than waiting for TTLs. As a backstop, version cache keys by a write-set epoch that failover bumps, which turns recovery into a single keyspace change.",
    remember: [
      "Sliding expiry on a hot key is a staleness bug that only shows up during disruption, which is exactly when it hurts.",
      "Cache TTLs on replicated data must be bounded by worst-case lag, not by typical lag.",
      "Failover should invalidate proactively. Waiting for a TTL to expire is not a recovery plan.",
    ],
  },
  {
    slug: "consumer-lag-without-backpressure",
    done: true,
    title: "Queue lag grows with no producer spike",
    description: "Consumer lag climbs 40k/min while producer rate is flat.",
    topic: "Queues",
    difficulty: "hard",
    date: "2026-09-25",
    symptom:
      "Over four hours, consumer lag grew steadily from zero to 9.7 million messages. The producer rate never changed, throughput was stable, and no consumer crashed or restarted. Lag only began falling after we manually scaled consumers from 12 to 60.",
    constraints: [
      { key: "Producer rate", value: "flat at 4.2k/s" },
      { key: "Consumer lag", value: "9.7M and rising" },
      { key: "Consumers", value: "12, no restarts" },
      { key: "Per-consumer rate", value: "350/s (down from 900/s)" },
      { key: "Errors", value: "0.04% retried" },
    ],
    evidence: [
      {
        kind: "code",
        language: "python",
        body: `def on_message(msg):
    if should_skip(msg):          # 0.4% of messages
        return                   # never acked
    handle(msg)                  # 900/s
    msg.ack()`,
      },
      {
        kind: "graph",
        label: "per-consumer throughput, 09:00-13:00",
        body: `09:00  ██████████████████████████ 900/s
10:00  ████████████                480/s
11:00  ██████                      290/s
12:00  ████                        160/s
13:00  ████                        150/s
// monotonic decay, no step change`,
      },
    ],
    task:
      "Producer rate is flat, consumers are healthy, and no errors are visible. What is consuming the consumers' capacity?",
    diagnosis:
      "Skipped messages were never acknowledged, so they were redelivered forever. Each skip returned immediately, which made it look like fast processing while actually returning the message to the broker for immediate redelivery. Those retry loops were cheap in CPU but saturated the broker's delivery path, so every consumer's effective throughput decayed as the redelivery rate grew. The 0.04% error rate was the visible tip: the 99.96% succeeding included thousands of messages being redelivered over and over, which no per-message metric distinguishes from real work.",
    fix:
      "Acknowledge skipped messages explicitly, including the ones you decide to drop — an unacked message is unprocessed work, never a no-op. Add a dead-letter queue with a bounded delivery count so poison messages stop cycling. Track redelivery rate as a first-class metric next to throughput, since a rising redelivery rate degrades throughput long before lag looks wrong. Finally, alert on consumer lag slope rather than absolute lag, which would have caught this within the first hour.",
    remember: [
      "A message you skip without acking is not skipped; it is redelivered immediately and forever.",
      "Redelivery rate belongs beside throughput in every queue dashboard.",
      "Alert on the slope of lag, not its value. A slow steady leak is invisible to a threshold.",
    ],
  },
  {
    slug: "lock-contention-on-hot-partition",
    done: true,
    title: "Throughput inverted under a hot partition",
    description: "Adding workers makes the hot key slower for every writer.",
    topic: "Concurrency",
    difficulty: "medium",
    date: "2026-09-24",
    symptom:
      "A single tenant's counter became the write hotspot. Scaling the worker pool from 8 to 32 reduced total throughput by 40% and increased p99 for the hot tenant from 12ms to 610ms, while every other tenant got faster.",
    constraints: [
      { key: "Workers", value: "8 → 32" },
      { key: "Throughput", value: "−40%" },
      { key: "Hot tenant p99", value: "12ms → 610ms" },
      { key: "Other tenants", value: "p99 improved 30%" },
      { key: "Contention", value: "single counter row" },
    ],
    evidence: [
      {
        kind: "code",
        language: "sql",
        body: `BEGIN;
SELECT value FROM counters WHERE tenant_id = 'acme' FOR UPDATE;
UPDATE counters SET value = value + 1 WHERE tenant_id = 'acme';
COMMIT;
-- one row, one lock: every worker for this tenant serialises here`,
      },
      {
        kind: "log",
        label: "lock wait, 32 workers",
        body: `lock_wait_total: 41s   (8 workers: 3s)
transactions:        2.1k/s (8 workers: 3.5k/s)
// total throughput fell because the lock serialises the
// whole shard, not just the hot row`,
      },
    ],
    task:
      "The hotspot is one tenant, yet total throughput fell when you added workers. Why did the other tenants get worse at supporting the change?",
    diagnosis:
      "The hot counter is updated inside an open transaction holding a row lock. With 32 workers, contention on that one row turned into a queue of blocked transactions, and those blocked transactions still held their connections, snapshots, and WAL buffers while waiting. The database was therefore carrying 32 sets of transaction state to do strictly sequential work — so throughput fell and the hot tenant's latency rose, even though that tenant's own request rate never changed. Other tenants improved because the freed-up lock holder time went to them, but the shard's total capacity dropped: contention converts parallel work into serial work while multiplying resource occupancy.",
    fix:
      "Shard the counter so concurrent increments for the same tenant do not serialise behind one row — a striped or bucketed counter trades exact reads for throughput and reconciles in the background. Keep the transaction as short as possible, or move increments out of the request path into a buffer that a single writer drains. Where a strict global sequence is genuinely required, route the hot tenant to a dedicated shard so its contention cannot consume shared capacity.",
    remember: [
      "Blocked transactions still consume connections, snapshots, and WAL buffers. Contention multiplies resource cost.",
      "A single hot row serialises the whole shard, not just the row. Capacity is set by the hotspot, not the average.",
      "Moving a counter increment out of the request path beats tuning the lock around it.",
    ],
  },
  {
    slug: "dashboard-blind-to-cpu-throttling",
    done: true,
    title: "Latency traced to nothing: CPU throttling at the cgroup limit",
    description: "Service averages 4% host CPU but is throttled 38% of the time.",
    topic: "Observability",
    difficulty: "easy",
    date: "2026-09-23",
    symptom:
      "Request latency tripled overnight. No deploy, no config change, no traffic increase. Every host-level dashboard looked calm: average CPU 4%, no throttling alarms, plenty of free memory.",
    constraints: [
      { key: "Host CPU avg", value: "4% (4 cores)" },
      { key: "Cgroup quota", value: "0.5 core" },
      { key: "Throttled periods", value: "38% of runtime" },
      { key: "p99", value: "22ms → 640ms" },
      { key: "Deploys", value: "none in 9 days" },
    ],
    evidence: [
      {
        kind: "code",
        language: "yaml",
        body: `resources:
  limits:
    cpu: 500m          # 0.5 core
  requests:
    cpu: 100m          # 1/5 of the limit
# no change here for 9 days; the node pool was replaced`,
      },
      {
        kind: "graph",
        label: "cpu.stat throttled_seconds, hourly",
        body: `throttled_usec per 1000s of runtime
00:00  ██                180
06:00  ███████           610
12:00  ███████████       880
18:00  █████████████     960
// correlates with a new node type with a lower burst credit`,
      },
    ],
    task:
      "Four percent average CPU and p99 up 30x. How do you reconcile those two numbers, and where would you look first?",
    diagnosis:
      "The service was CPU-limited well below its host-level visibility. Host CPU averaged 4% across four cores because the cgroup quota allowed only half a core, so the container was throttled for 38% of every period — and throttling looks like a stall, not like load, because the scheduler simply stops handing out CPU time. The overnight change was infrastructural: a node-pool replacement with lower burst credit, not an application change, which is why no deploy appeared in the window. Average CPU hid this completely; the distribution did not, because the request handlers were being descheduled mid-execution.",
    fix:
      "Alert on `container_cpu_cfs_throttled_seconds_total` as a ratio, not on average CPU, and add a saturation alert on the quota itself. Keep requests equal to limits for latency-sensitive services so the scheduler reserves rather than competes for the quota, and pin the request to match if the workload is bursty. Finally, treat node-pool and instance-type changes as deploys in your alerting, because from the application's perspective that is exactly what this was.",
    remember: [
      "Average CPU is not saturation. A throttled cgroup looks idle at the host level.",
      "CPU throttling presents as unexplained latency stalls with no error, no queue, and no deploy.",
      "Infrastructure changes are deploys. Watch for them or you will debug last night's node pool as today's mystery.",
    ],
  },
];

export const byDateDesc = [...questions].sort((a, b) =>
  b.date.localeCompare(a.date),
);

/** The featured incident for the Today page — the most recent unpublished one. */
export const todaysQuestion =
  byDateDesc.find((q) => !q.done) ?? byDateDesc[0];

export const recentQuestions = (count: number) =>
  byDateDesc.filter((q) => q.slug !== todaysQuestion.slug).slice(0, count);

export const bySlug = new Map(questions.map((q) => [q.slug, q]));

export const topicCounts = TOPICS.map((topic) => ({
  topic,
  count: questions.filter((q) => q.topic === topic).length,
})).filter((t) => t.count > 0);

/** Contribution-style streak data — 7 rows (weekdays) x N weeks. */
export const streakWeeks = 12;
export const streakGrid = (() => {
  const done = new Set(questions.filter((q) => q.done).map((q) => q.date));
  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: streakWeeks }, (__, week) => {
      // deterministic synthetic history seeded from real completions
      const d = new Date(Date.UTC(2026, 8, 28));
      d.setUTCDate(d.getUTCDate() - (streakWeeks - 1 - week) * 7 + day);
      const iso = d.toISOString().slice(0, 10);
      if (done.has(iso)) return "done" as const;
      if (week === 0) return "empty" as const;
      return (week * 7 + day) % 5 === 0 ? ("missed" as const) : ("done" as const);
    }),
  );
})();

import type { Incident } from "./types";

export const rateLimiterSharedStateRedis = {
  slug: "rate-limiter-shared-state-redis",
  title:
    "One customer's 50,000 req/min spreads across 20 instances. Only shared state sees the whole stream.",
  publishedAt: "2026-10-02",
  difficulty: "hard",
  topic: "platform",
  tags: ["redis", "rate-limiting", "distributed-systems", "concurrency", "sla"],
  symptom:
    "Your public API serves 50,000 paying customers, each allotted 100 requests/minute. There is no rate limiting at all. A bug in one customer's integration starts firing 50,000 requests/minute at /search — 500x its quota — and latency degrades for everyone else. The API runs as 20 stateless instances behind a round-robin load balancer with no sticky sessions, so any instance can get any customer's request. A Redis cluster is already available, used for caching elsewhere.",
  constraints: [
    "50,000 customers, each limited to 100 req/min",
    "20 API instances, no sticky sessions — round-robin, so a customer's stream is spread across all 20",
    "The limit must hold globally per customer. An instance-local counter lets one customer reach 100 × 20 = 2,000 req/min",
    "Well under 5ms added to the request path at p99",
    "Sane behaviour when Redis is slow or briefly unavailable — rate limiting must never be what takes the API down",
    "Rolling reset: no bursting 100 requests either side of a minute boundary",
  ],
  evidence: [
    "The runaway customer's ~833 req/s arrive spread evenly over all 20 instances — roughly 2,500/min each, about 25x the whole 100/min quota, and each instance sees a slice that looks locally plausible",
    "p99 latency for other customers rises in the same window as the flood, which points at a shared downstream resource rather than one customer's code path",
    "A read-then-increment limiter passes every single-instance test and still lets the quota be exceeded once two instances overlap — the failure only appears under cross-instance concurrency",
    "The limiter's own Redis call is ~0.3-1ms p99 when Redis is healthy, but the same call has a p99 in the seconds when Redis is degraded, so the request path inherits Redis's tail whether it wants to or not",
    "At full quota across all 50,000 customers the limiter issues ~83,000 script calls/sec, a large share of what one single-threaded Redis node can execute",
  ],
  question:
    "Design the limiter end to end: where the counter lives, what makes the check-and-increment indivisible, what happens when Redis is down, and what changes when limits are per-endpoint.",
  picks: [
    {
      id: "counter-location",
      prompt: "Where does the counter live, across 20 stateless instances?",
      options: [
        {
          id: "instance-memory",
          label:
            "In each instance's own memory, so no request pays for a network hop to a shared store",
        },
        {
          id: "sticky-sessions",
          label:
            "In the load balancer, by turning on sticky sessions so a customer maps to one instance",
        },
        {
          id: "shared-redis",
          label:
            "In the shared Redis, keyed by customer, so all 20 instances read and write one counter",
        },
        {
          id: "customer-row",
          label:
            "In the customer database row, incremented per request inside the existing transaction",
        },
      ],
      answer: "shared-redis",
    },
    {
      id: "rolling-window",
      prompt: "Which window algorithm satisfies the rolling-reset requirement?",
      options: [
        {
          id: "rolling",
          label:
            "A rolling window over the trailing 60 seconds, so there is no reset edge for a client to burst across",
        },
        {
          id: "fixed-expiry",
          label:
            "A fixed window, since Redis key expiry gives every customer a window that resets on its own",
        },
        {
          id: "staggered-reset",
          label:
            "A fixed window whose reset second is hashed from the customer id, spreading resets across the minute",
        },
        {
          id: "headroom",
          label:
            "A fixed window of 200 req/min, which absorbs the boundary burst while still capping the flood",
        },
      ],
      answer: "rolling",
    },
    {
      id: "redis-unavailable",
      prompt: "Redis is degraded. Do you fail open or fail closed?",
      options: [
        {
          id: "fail-closed",
          label:
            "Fail closed on anything you cannot verify, so the quota holds even while the limiter is degraded",
        },
        {
          id: "fail-closed-writes",
          label:
            "Fail closed for writes and paid endpoints, fail open for reads, splitting the risk by method",
        },
        {
          id: "queue",
          label:
            "Queue each request until Redis answers, so no decision is ever made without a verified count",
        },
        {
          id: "fail-open-local",
          label:
            "Fail open into a bounded local per-instance budget, behind a short deadline and a breaker",
        },
      ],
      answer: "fail-open-local",
    },
    {
      id: "atomic-operation",
      prompt: "Which Redis operation makes the check and the increment indivisible?",
      options: [
        {
          id: "get-then-incr",
          label:
            "GET the count, then INCR when it is under the limit, since Redis runs one command at a time",
        },
        {
          id: "lua-script",
          label:
            "A Lua script via EVALSHA that reads, compares, increments only if allowed, returns the decision",
        },
        {
          id: "incr-then-expire",
          label:
            "INCR the counter and set its expiry with a separate EXPIRE, then test the value INCR returned",
        },
        {
          id: "multi-exec",
          label:
            "MULTI/EXEC around the GET and the INCR, which queues both so they execute back to back",
        },
      ],
      answer: "lua-script",
    },
    {
      id: "per-endpoint",
      prompt: "Now add per-endpoint limits on top of the per-customer limit. What changes?",
      options: [
        {
          id: "independent-rules",
          label:
            "Per-endpoint keys checked as extra independent rules, leaving the global key to catch the total",
        },
        {
          id: "replace-global",
          label:
            "Drop the per-customer key and cap each endpoint instead, since endpoint caps are more informative",
        },
        {
          id: "one-script",
          label:
            "Endpoint keys alongside the global key, every applicable bucket checked and committed in one script",
        },
        {
          id: "second-limiter",
          label:
            "A second limiter process dedicated to endpoint caps, so the two dimensions scale independently",
        },
      ],
      answer: "one-script",
    },
  ],
  diagnosis: `**Where the counter lives.** Round-robin with no stickiness means the runaway customer's ~833 req/s arrive as ~2,500/min on every one of the 20 instances. An instance-local limiter would grant each instance its own 100/min, and the fleet would admit 20 × 100 = 2,000/min — 20x the quota, arrived at honestly rather than by cheating. Nothing local can fix that: the state that answers "how much has this customer sent in the last minute" has to be readable by all 20 before any of them decides, and Redis is the only thing in the picture that already is. Gateway-only enforcement has the mirror failure — it caps one customer per gateway, so 20 gateways means 20x again — and it cannot see the customer identity a signed request carries.

*Key insight: the counter is not the design. The design is which system's state all 20 instances are required to share before any of them is allowed to answer.*

**Why the window has to roll.** A fixed window keeps one number per customer and zeroes it on the clock's schedule. A client that times its sends to the boundary gets 100 in the last second of window N and 100 in the first second of N+1 — about 2x the advertised rate, briefly. Honest about how small that is: it is a short, bounded 2x, not an unbounded hole, and no reasonable client would build a business on it. It matters here for two concrete reasons. The requirement names it explicitly, so a fixed window simply fails the spec. And the thing being protected is a shared downstream resource, where 2x concentrated on /search — the expensive endpoint — lands exactly on the cliff the incident started with. Staggering resets by hashing the customer id does not help: each customer still gets its own 2x at its own edge.

Rolling options, in rising order of cost. A *sliding window log* is exact: a sorted set per customer, trim entries older than 60s, count what is left. The catch is memory — at full quota that is 50,000 × 100 = 5M live members, and with unique request-id members a sorted set runs on the order of 100 bytes per element, so roughly half a gigabyte, rewritten on every request. Manageable, and worth stating rather than calling it free. The usual approximation is a *weighted sliding window counter*: split the minute into N buckets, sum the buckets that fall entirely inside the trailing window, and add the oldest partially-overlapping bucket weighted by the fraction of it still inside. Its error runs both ways, because it assumes requests were spread uniformly within each bucket — it under-counts a burst that landed late in the oldest bucket and over-counts one that landed early. One key and no burst hole at all is GCRA: store a theoretical arrival time, allow when \`now >= TAT - tolerance\`, and on allow push TAT to \`max(TAT, now) + emissionInterval\`. That is exact for arrival rate and about fifteen lines of Lua — worth writing, because \`redis-cell\` is a third-party module that most managed Redis does not have.

*Key insight: fixed windows have an edge, and the client's clock is aimed at it. The fix is not a bigger window, it is a window that has no edge.*

**When Redis is unavailable.** A Redis outage takes out all 20 checks at the same instant, and that simultaneity settles the direction. Failing closed converts a dependency blip into a 100% error rate on the public API — strictly worse than the abuse it prevents, and it hands one customer's integration a denial-of-service lever over everyone else. Fail open, but do not fail open into *nothing*: keep a small local budget per customer on each instance (a token bucket, so degradation does not reintroduce the boundary burst) and admit against that when Redis is out. Size it around 2x the fair share — fair share is 100 ÷ 20 = 5/min per instance, so roughly 10/min per instance, or ~200/min fleet-wide during the outage. That is a bounded 2x overshoot in place of an unbounded 500x, and the trade is honest: round-robin does not split traffic perfectly evenly, so a customer already at 90/min can collect a spurious 429 while the limiter is degraded. That is the right way round — a wrong answer for a few near-quota customers during an outage beats an unbounded flood for the duration. Two things make the degraded path safe: a hard deadline of about 2ms on the Redis call, so a slow Redis cannot spend the latency budget, and a breaker that opens after a few timeouts and half-opens on a trickle of probes.

*Key insight: over-admitting during an outage is bounded and self-healing when Redis returns. Under-admitting is a self-inflicted outage nobody asked for.*

**What makes the check indivisible.** Redis executes one command at a time on a single thread, so a Lua script is the atomic unit — its read, compare, increment and expiry run to completion with nothing interleaved, and one \`EVALSHA\` is one round trip, which means atomicity and the latency budget are the same decision. The two-command version fails in a window that is invisible single-instance: instance A GETs and is told 99, instance B GETs and is told 99, both compute 99 < 100, both INCR, both return 200 OK — the customer gets 101 requests with two instances in flight, and more with more. Pipelining removes the round trip, not the interleaving, so it fails identically. \`MULTI/EXEC\` is subtler: it does queue the commands so nothing interleaves between them, but it cannot express a conditional — there is no "increment only if under the limit" in a transaction — so it leaves you incrementing unconditionally and compensating afterwards, which is the wrong primitive.

Worth conceding one thing: increment-then-test-the-returned-value is atomic, and it is what most simple fixed-window limiters use. It is not wrong. It fails *here* for two specific reasons. A rolling window needs the count before deciding, which INCR cannot give you. And rejected requests have already consumed budget, so a client that keeps hammering past the limit burns its own window and locks itself out longer — self-penalising, and with several buckets the compensating decrement is itself a race.

*Key insight: pipelining optimises the round trip, MULTI/EXEC optimises isolation, and only a script gives you the conditional. You need the conditional.*

**Per-endpoint limits.** The global key stays — the question adds endpoint caps on top of it, so nothing is being replaced, and a \`/search\` cap of 30 under a global 100 is an ordinary configuration rather than a partition that has to sum to 100. The change is mechanical: one key per (customer, endpoint), plus the global key, and every applicable bucket checked and committed together. Get that wrong and you get a new failure mode: check the global bucket, consume it, then get rejected by the endpoint bucket, and the customer has been charged for a request that never happened — with the buckets drifting permanently apart. Two costs to budget for. On a cluster, a script touching several keys only runs if they hash to one slot, which is what the \`{customerId}\` hash tag in the key name is for. And the limiter's own load is not free: at full quota across 50,000 customers this is ~83,000 script calls/sec against a single-threaded Redis, a large share of what one node can execute — so spread the keyspace across cluster slots rather than pinning it to one, or the limiter becomes the next incident in this archive.

*Key insight: adding a dimension multiplies work, not budget. The lesson is atomic commit across every bucket that applies, not a rule about how the caps relate.*`,
  fix: `- **The primitive: one Lua script per request, via \`EVALSHA\`.** Read the rolling count, compare to the limit, mutate only if allowed, refresh the TTL, and return the decision with remaining and reset — one atomic execution, one round trip, so atomicity and the sub-5ms budget are the same decision. \`SCRIPT LOAD\` at boot, handle \`NOSCRIPT\` by reloading, so the body never ships on the hot path.
- **The algorithm: a rolling window, chosen for its memory profile.** Exact sliding window log if you want no approximation and can carry ~500MB of sorted-set entries at full quota; weighted sliding window counter if you want one key per customer and can accept a two-directional error bounded by bucket width (say 1s buckets, so the error is small and the burst hole is short); GCRA if you want exact arrival rate, a hard burst ceiling and one key — fifteen lines of Lua, and do not reach for \`redis-cell\`, which is a third-party module missing from most managed Redis.
- **Fail open, degraded but bounded.** ~2ms deadline on the Redis call, breaker open after repeated timeouts with a half-open probe, and while degraded admit against a local token bucket of roughly 2x the fair share (≈10/min per instance, ≈200/min fleet-wide). Say the trade out loud in the runbook: near-quota customers can see spurious 429s during a Redis outage, and that is the intended side of the trade.
- **Latency and load budget.** One round trip, Redis in the same region as the API, a pooled connection per instance (20 pools, not one socket). Do not pipeline the check-and-increment — it buys no atomicity — and do not retry an ambiguous timeout, because the increment may already have landed and a retry double-counts, biasing a fail-open design toward over-counting. Do not over-protect Redis here: at 833 req/s this customer is a rounding error against a node that does ~100k ops/s. The win is rejecting before the expensive \`/search\` work, not before the counter.
- **Per-endpoint limits.** Composite keys \`rl:{cust_123}:search\`, where the hash tag is not decoration — a cluster script touching the global and endpoint keys only runs if both land in one slot. Check every applicable bucket and commit only after all checks pass, so a rejected request consumes nothing anywhere. Cache the customer's limits locally; create keys lazily and let TTL reap them, since cardinality (customers × endpoints × buckets) is the cost.
- **Operational surface.** 429 with \`Retry-After\` and \`X-RateLimit-Limit/Remaining/Reset\` from the same round trip. Alert on rejection rate per customer, on breaker state, and on limiter latency — the first catches the runaway integration in seconds, the third catches the limiter becoming the outage. Exempt health checks and internal callers, count only what you serve, and reconcile the local fallback budget against the global counter when Redis returns rather than letting it age out.`,
  remember: [
    "A limit enforced in per-instance state is a per-instance limit multiplied by the instance count. The counter lives in shared state, and the read and the write happen inside it — never across the network.",
    "Fixed windows have an edge and the client's clock is aimed at it: 100 + 100 around a boundary is a short 2x. Sliding windows remove the edge; the approximation only needs its error smaller than the burst you care about.",
    "When the shared counter is gone, fail open into a bounded local approximation. A hard dependency in front of every request turns a dependency blip into a fleet-wide outage, which is worse than the abuse you were limiting.",
    "Atomic means one indivisible step with a conditional in it. Pipelining optimises the round trip, MULTI/EXEC optimises isolation, and only a script lets you decide — and increment-then-compensate is a real pattern that simply does not fit a rolling window.",
    "Adding a dimension multiplies work, not budget. Independent endpoint caps under a global cap are ordinary config; what must be atomic is checking and committing every applicable bucket together.",
  ],
  rubric: [
    {
      text: "Put the counter in shared Redis and showed why instance-local state yields 100 × 20 = 2,000 req/min",
      dim: "correctness",
    },
    {
      text: "Explained the fixed-window boundary burst as a bounded short 2x, and located it honestly — the stated requirement, plus concentration on the expensive endpoint",
      dim: "process",
    },
    {
      text: "Named a rolling algorithm and its real trade-off: sliding window log (~5M members, roughly half a gigabyte at full quota), weighted counter (two-directional error), or GCRA",
      dim: "depth",
    },
    {
      text: "Justified fail open on the grounds that a Redis outage kills all 20 checks at once, so failing closed self-inflicts a 100% outage",
      dim: "correctness",
    },
    {
      text: "Went past bare 'fail open' to a bounded fallback sized at roughly 2x the fair share, and named the false-429 trade for near-quota customers",
      dim: "depth",
    },
    {
      text: "Named the atomic operation (Lua/EVALSHA) and showed the interleaving where GET then INCR admits 101 with two instances — and that pipelining and MULTI/EXEC do not fix it",
      dim: "correctness",
    },
    {
      text: "Treated per-endpoint limits as extra caps under the existing global key, with the lesson being one atomic check-and-commit across buckets, plus the hash-tag requirement",
      dim: "depth",
    },
  ],
} satisfies Incident;

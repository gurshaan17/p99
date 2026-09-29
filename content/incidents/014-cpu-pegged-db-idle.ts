import type { Incident } from "./types";

export const cpuPeggedDbIdle = {
  slug: "cpu-pegged-db-idle",
  title: "5,000 req/sec. App server CPU at 100%, Postgres under 20%. Latency goes from 5ms to 400ms.",
  publishedAt: "2026-09-22",
  difficulty: "medium",
  topic: "runtime",
  tags: ["go", "connection-pool", "concurrency", "pprof"],
  symptom:
    "A URL shortener: one Go process, one Postgres, GET /r/{shortcode} looks up a long URL and issues a redirect. Under a light load it is fine at 5ms. Under a load test at 5,000 requests/sec, the app server's CPU climbs to 100% while Postgres CPU stays under 20% — and per-request latency balloons to 400ms.",
  constraints: [
    "Single Go process, 4 CPU cores, 8GB RAM",
    "Single Postgres instance on a separate machine, mostly idle (<20% CPU) during the incident",
    "shortcode has a B-tree index; the query is exactly SELECT long_url FROM urls WHERE shortcode = $1",
    "Each DB query takes ~2ms round-trip including network",
    "Sustained 5,000 req/sec, one DB query per request",
    "Go's database/sql pool settings are untouched — no MaxOpenConns, no MaxIdleConns, no lifetime",
    "No caching layer in front of the database",
  ],
  evidence: [
    "Postgres CPU never rises, and the query itself is a covered index lookup — the database is not the constraint",
    "The handler is trivial: one query, one redirect, almost no work of its own",
    "The process is running far more concurrent requests than 4 cores can execute, all of them blocked on the same small set of DB connections",
    "No pprof endpoint was exposed, so nobody has a profile of where the CPU is actually going",
  ],
  question:
    "If Postgres is idle, what is burning 100% of the app server's CPU, and what would you check before changing a single line of code?",
  picks: [
    {
      id: "root-cause",
      prompt: "Where is the CPU actually going?",
      options: [
        {
          id: "concurrency-overhead",
          label: "Scheduling, pool-mutex contention, and GC from thousands of goroutines waiting on a small connection pool — not the handler's work",
        },
        { id: "db-slow", label: "The SQL query is slow and Postgres is the bottleneck" },
        { id: "redirect-encoding", label: "Encoding the redirect response is burning the CPU" },
        { id: "gc-tuning", label: "GOGC is set too high, so garbage collection is running constantly" },
      ],
      answer: "concurrency-overhead",
    },
    {
      id: "first-step",
      prompt: "What do you do first?",
      options: [
        {
          id: "profile",
          label: "Expose pprof and take a CPU profile during the load test — measure before hypothesising",
        },
        { id: "add-cache", label: "Add a Redis cache in front of the database" },
        { id: "raise-cores", label: "Add CPU cores to the app server" },
        { id: "rewrite-handler", label: "Rewrite the handler to be more efficient" },
      ],
      answer: "profile",
    },
    {
      id: "fix",
      prompt: "What is the actual fix?",
      options: [
        {
          id: "bound-pool",
          label: "Bound MaxOpenConns and set MaxIdleConns to match, so excess requests queue at the pool as controlled backpressure",
        },
        { id: "goroutine-limit", label: "Add a goroutine-per-request limit" },
        { id: "raise-pool", label: "Raise the connection limit as high as possible" },
        { id: "add-replicas", label: "Add read replicas to Postgres" },
      ],
      answer: "bound-pool",
    },
  ],
  diagnosis: `**An idle database is the most useful thing in this incident.** It rules out the query. \`SELECT long_url WHERE shortcode = $1\` is a covered index lookup, Postgres is at 20% CPU, and the round-trip is 2ms — the database is answering fine. The cost is entirely inside the Go process.

The mechanism is a concurrency problem wearing a CPU-bound costume. Go's \`net/http\` runs one goroutine per request, and goroutines are genuinely cheap (~2–4KB of stack) — that is not the problem. The problem is that at 5,000 req/sec on 4 cores, thousands of goroutines are all blocked waiting for the *same small set* of database connections from \`database/sql\`. They wake, contend on the pool's internal mutex, block again, and get rescheduled. The CPU is being spent on scheduler work, futex wakeups, and context switches, plus GC pressure from the allocation rate of all that request handling. None of that is your handler. It is the cost of being asked to do 5,000 things per second with 4 cores and a narrow shared resource in the middle.

The default pool settings are what turn a small problem into this one. With \`MaxOpenConns\` unset, the pool is unbounded, so the process can open far more connections than Postgres serves well — and even where it does not, the pool hands out a small number of reusable connections to a huge number of waiting goroutines, which is exactly the contention described above. **Bounding the pool does not reduce throughput; it moves the queue somewhere you can see and control**, converting thousands of goroutines fighting over connections into a bounded, measurable wait.

One thing to check honestly: 50 connections × (1 / 0.002s) ≈ 25,000 req/sec of theoretical headroom, so a 20–50 connection pool is comfortably enough for this workload. But that is arithmetic worth doing out loud, not a number to guess — if the arithmetic had not worked, bounding the pool would have turned a CPU problem into a latency problem.`,
  fix: `- **Profile before changing anything.** Expose \`net/http/pprof\` and take a CPU profile under load. Confirm the hot path is \`runtime.futex\` / pool mutex / GC rather than handler logic — that is the hypothesis, and a profile is what makes it a finding.
- **Bound the pool explicitly**: \`db.SetMaxOpenConns(20-50)\`, sized against Postgres's own connection handling and the throughput arithmetic (connections ÷ 2ms per query).
- **Set \`db.SetMaxIdleConns\` equal to \`MaxOpenConns\`** so connections are reused rather than torn down and re-established. Churn is expensive: re-handshaking and re-authenticating per request is CPU the app burns for nothing.
- **Set \`db.SetConnMaxLifetime\`** to avoid unbounded connection age, but not so low that it thrashes.
- **Bound the work in front of the pool** as well, so a slow dependency produces backpressure rather than unbounded goroutine growth. The pool bounds connections; it does not bound the goroutines waiting on them.
- **Watch the numbers that matter**: \`db.Stats()\` for \`WaitCount\` and \`WaitDuration\` (the queueing you just made visible), goroutine count, and GC rate. \`WaitDuration\` rising means the pool is the constraint and needs more capacity; goroutines rising with it flat means the handlers themselves are slow.`,
  remember: [
    "\"CPU pegged but the database is idle\" almost never means the query is slow. It means look at your own process's concurrency machinery — goroutines, locks, GC — before you look at Postgres.",
    "Go's database/sql pool is effectively unbounded unless you bound it yourself. This is one of the most common \"worked in dev, died in the load test\" bugs.",
    "Always profile before hypothesising. Say \"I'd take a CPU profile first\" before reaching for a fix — it shows process instead of a pattern-matched answer.",
  ],
  rubric: [
    {
      text: "Ruled out the database using the idle-CPU and query-shape evidence, not by assumption",
      dim: "process",
    },
    {
      text: "Identified pool contention, scheduling, and GC as the CPU cost — not the handler",
      dim: "correctness",
    },
    {
      text: "Said \"profile first\" before proposing a fix",
      dim: "process",
    },
    {
      text: "Explained that bounding the pool moves the queue rather than reducing throughput",
      dim: "depth",
    },
    {
      text: "Did the throughput arithmetic on pool size instead of quoting a magic number",
      dim: "depth",
    },
  ],
} satisfies Incident;

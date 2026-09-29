import type { Incident } from "./types";

export const seqScanBeatsIndexWhale = {
  slug: "seq-scan-beats-index-whale",
  title: "40 rows in 1ms. 6 million rows in 9 seconds, with a sequential scan — on a table that has an index on user_id.",
  publishedAt: "2026-09-23",
  difficulty: "hard",
  topic: "databases",
  tags: ["query-planner", "indexes", "sequential-scan", "mvcc"],
  symptom:
    "A 100M-row events table with a B-tree index on user_id. SELECT * FROM events WHERE user_id = $1 takes 1ms for a typical user with about 40 rows. For one whale account with 6M rows it takes 9s, and EXPLAIN shows a sequential scan even though the index exists. A teammate set enable_seqscan = off to force the index. The query now takes 40s. He asks why the planner is stupid and why the index made it worse.",
  constraints: [
    "100M rows, ~100 bytes each, 8KB pages — roughly 1.25M heap pages, about 10GB",
    "The user_id index is ~2.5GB, and a user's rows are scattered across the heap because inserts interleave across users over time",
    "16GB RAM with shared_buffers = 4GB, so the table does not fit in cache",
    "SSD: ~0.1ms per random 8KB read, ~1GB/s sequential throughput",
    "The table is heavily updated and autovacuum sometimes lags",
    "The query must return full rows — SELECT * — for the whale's 6M rows",
  ],
  evidence: [
    "The typical-user plan is an index scan with ~40 heap fetches; the whale's plan is a seq scan over 1.25M pages",
    "Forcing the index produces a plan dominated by random single-page reads across the whole table",
    "The whale's rows are spread over nearly every one of the 1.25M pages — about 5 matches per page on average",
    "EXPLAIN (ANALYZE, BUFFERS) on the typical user shows ~40 heap fetches and ~40 buffers read, so the index path touches almost nothing — the same plan is not slow, it is being asked to do a different job",
  ],
  question:
    "Why is the index slower than reading the entire table, what is the planner actually comparing, and what would you do about a user with 6M rows?",
  picks: [
    {
      id: "root-cause",
      prompt: "Why does the index lose at 6M rows?",
      options: [
        {
          id: "heap-fetches",
          label: "The index is cheap but points at TIDs; SELECT * then needs a random heap fetch per match, and 6M scattered matches touch nearly every page multiple times",
        },
        { id: "b-tree-depth", label: "The B-tree grows too deep at 100M rows to descend efficiently" },
        { id: "index-corrupt", label: "The index is corrupted and not being used" },
        { id: "no-stats", label: "The planner has no statistics for user_id" },
      ],
      answer: "heap-fetches",
    },
    {
      id: "crossover",
      prompt: "What is the planner comparing the two plans on?",
      options: [
        {
          id: "cost-model",
          label: "Estimated page costs: seq_page_cost vs random_page_cost per page, weighted by estimated selectivity and correlation",
        },
        { id: "wall-clock", label: "Measured execution time from previous runs" },
        { id: "row-count", label: "Total row count in the table" },
        { id: "cache-size", label: "Whatever fits in shared_buffers" },
      ],
      answer: "cost-model",
    },
    {
      id: "forcing-worse",
      prompt: "Why did enable_seqscan = off make it 4x worse?",
      options: [
        {
          id: "removed-cheapest",
          label: "It deleted the cheapest option and left a plain index scan doing random heap fetches — a diagnostic, not a fix",
        },
        { id: "disk-cache", label: "It cleared the OS page cache" },
        { id: "stats-reset", label: "It invalidated the planner's statistics" },
        { id: "lock-contention", label: "It caused a lock contention storm" },
      ],
      answer: "removed-cheapest",
    },
    {
      id: "real-fix",
      prompt: "What actually fixes this access pattern?",
      options: [
        {
          id: "question-the-query",
          label: "No API needs 6M full rows in one query — page it, or move the aggregate off the OLTP path",
        },
        { id: "drop-index", label: "Drop the index so the planner stops being tempted" },
        { id: "raise-stat-target", label: "Raise the statistics target until the plan flips" },
        { id: "cluster", label: "CLUSTER the table on user_id" },
      ],
      answer: "question-the-query",
    },
  ],
  diagnosis: `The planner is right, and the index is not "broken". A B-tree lookup is genuinely cheap — a few page reads to descend, then a scan of leaf entries. **The cost is what comes after it.** Every index entry holds a TID pointing into the heap, and \`SELECT *\` needs the whole row, so every match is a separate heap fetch.

At 40 rows that is ~40 fetches, nearly all cache hits, about 4ms worst case. At 6M scattered rows, the table has 1.25M pages, so each page is visited roughly 5 times, and with 4GB of cache over a 10GB table many of those become real disk reads: \`6M × 0.1ms\` is ~600s of I/O before any cache help, which is the 40s observed once the cache does its share. A seq scan reads 1.25M pages **once**, sequentially, at ~1GB/s — about 10s, which is the 9s measured. The planner is choosing between "touch almost every page, several times, at random" and "touch every page once, in order", and the second is genuinely cheaper. The crossover is not about rows, it's about distinct pages touched and how random the access is.

\`enable_seqscan = off\` did not make the index work; it made the seq scan artificially expensive and removed the cheaper plan from consideration. \`OFF\` does not forbid a seq scan, it just prices it out of contention — so the planner reached for a plain index scan with random heap fetches, which is the worst of both worlds. It is a diagnostic switch, not a fix.

The interesting part is what the estimate misses. **An index-only scan is the only way this gets cheap** — if the index covers the columns needed, Postgres can skip the heap entirely. It can only do that for pages the visibility map marks all-visible; anything else still needs a heap visit to check MVCC visibility. A heavily-updated table with lagging autovacuum has many pages that are not all-visible, so an "index-only" scan quietly keeps doing heap fetches. This is why \`EXPLAIN (ANALYZE, BUFFERS)\` and the \`Heap Fetches:\` line matter more than the plan's node type here.

And the real answer is upstream of all of it: **no API needs 6 million full rows in one query.** That is a paging problem, or a reporting problem, and it should not be running in the OLTP path.`,
  fix: `- **Question the access pattern first.** Nothing needs 6M full rows at once. Use keyset pagination — \`WHERE user_id = $1 AND id > $last ORDER BY id LIMIT 1000\` — on a composite \`(user_id, id)\` index, so each request touches a bounded number of rows.
- **If only a few columns are needed, make the index cover them**: \`CREATE INDEX ... ON events (user_id, id) INCLUDE (col_a, col_b)\`. That enables an index-only scan and skips heap fetches entirely.
- **Verify the index-only scan is real.** Check \`EXPLAIN (ANALYZE, BUFFERS)\` for \`Heap Fetches:\` — a non-zero count means the visibility map is not all-visible and the scan is still going to the heap. Tune autovacuum for this table until it is near zero.
- **Take the whale's aggregates off the OLTP path entirely**: precompute them, or partition and archive. A read replica serves the read-only history fine, but replica lag means it cannot back a correctness-sensitive read, so do not point one of those at it.
- **Lower \`random_page_cost\` for SSD** (often ~1.1) so the cost model matches the hardware, and keep statistics fresh — \`ANALYZE\`, with a higher statistics target on a skewed column like \`user_id\`.
- **Don't \`CLUSTER\` on \`user_id\`.** It takes a heavy lock, rewrites the table once, helps only that one ordering, and decays as new rows arrive.
- **Set \`statement_timeout\`** so a 40s scan can never starve normal traffic, and use \`pg_stat_statements\` plus \`auto_explain\` to catch these shapes in production.`,
  remember: [
    "An index lookup is cheap; the heap fetches it triggers are the cost. Selectivity times scatter decides whether the index beats a sequential scan.",
    "Forcing a plan treats a symptom. Fix the inputs — stats, cost settings, index design, query shape — and ask whether the query should exist at all.",
    "Index-only scans depend on the visibility map, so heavy updates plus lagging vacuum quietly turn them back into heap-fetching scans. Always check \"Heap Fetches\" in EXPLAIN (ANALYZE, BUFFERS).",
  ],
  rubric: [
    {
      text: "Explained the cost as heap fetches driven by scatter, not B-tree depth",
      dim: "correctness",
    },
    {
      text: "Estimated the crossover with numbers: pages touched, random vs sequential I/O",
      dim: "depth",
    },
    {
      text: "Identified enable_seqscan = off as a diagnostic that removes the cheapest plan",
      dim: "correctness",
    },
    {
      text: "Noticed the index-only scan depends on the visibility map and can silently degrade",
      dim: "depth",
    },
    {
      text: "Questioned whether a 6M-row SELECT * belongs in the request path at all",
      dim: "process",
    },
  ],
} satisfies Incident;

import type { Incident } from "./types";

export const configPropagationFailStatic = {
  slug: "config-propagation-fail-static",
  title: "A generated config file turns one gradual database rollout into repeating edge outages",
  publishedAt: "2026-10-05",
  difficulty: "hard",
  topic: "platform",
  tags: ["config-propagation", "rust", "clickhouse", "fail-static", "blast-radius"],
  symptom:
    "You run a global edge network. At 11:28 UTC customers start seeing 5xx pages. Your tests catch it by 11:31, and the error rate spikes, falls to baseline, and spikes again every few minutes. You recently weathered record DDoS attacks, so the pattern looks like another one. The status page, which is hosted outside your own infrastructure, also goes down.",
  constraints: [
    "A feature file is pushed to the entire network every few minutes so new bot tactics can be deployed quickly",
    "A query on a ClickHouse cluster generates that file every five minutes, while the cluster is being updated node by node",
    "The bot module preallocates memory for 200 features; normal use is about 60",
    "Two proxy generations are live: the old proxy and the new proxy",
    "Object storage, identity proxying, and the web login challenge widget all depend on the same core proxy",
  ],
  evidence: [
    "The 5xx rate jumps at 11:28, recovers, jumps again, and only later fails continuously",
    "A database access-control change finished deploying at 11:05, 23 minutes before the first errors",
    "Every failing new-proxy worker logs `thread new_proxy_worker_thread panicked: called Result::unwrap() on an Err value`",
    "Failing feature files contain well over 200 features; good files contain about 60",
    "The file-building query asks for a table's column names without restricting it to one database",
    "On the new proxy, bot-dependent traffic gets 5xx. On the old proxy, it keeps serving but every bot score becomes zero",
    "CPU use rises because debugging and observability systems spend it on uncaught errors",
    "The first hour and a half points at degraded object storage, which is adjacent infrastructure rather than the cause",
  ],
  question:
    "Why did the 5xx rate follow the database rollout, and what should the proxy have done with an invalid feature file?",
  picks: [
    {
      id: "why-errors-oscillated",
      prompt: "Why did the 5xx rate oscillate every few minutes?",
      options: [
        { id: "attack-waves", label: "Attack waves arriving every five minutes" },
        { id: "autoscaler", label: "Proxy capacity cycling with the autoscaler" },
        { id: "gc-pauses", label: "Garbage-collection pauses across workers" },
        {
          id: "mixed-cluster-output",
          label: "A gradual ClickHouse update alternated good and bad files",
        },
      ],
      answer: "mixed-cluster-output",
    },
    {
      id: "broken-assumption",
      prompt: "Which broken assumption started the chain?",
      options: [
        { id: "database-never-changes", label: "The proxy assumed no database setting could change" },
        { id: "fixed-bot-count", label: "The model assumed the bot feature set was fixed" },
        { id: "status-page-isolated", label: "The status page assumed it was outside the blast radius" },
        {
          id: "query-saw-one-database",
          label: "The file query assumed only one database's columns were visible",
        },
      ],
      answer: "query-saw-one-database",
    },
    {
      id: "over-limit-file",
      prompt: "What should the proxy do when it receives a file over its 200-feature limit?",
      options: [
        { id: "crash", label: "Crash and let the worker supervisor restart it" },
        { id: "truncate", label: "Truncate the file silently and continue" },
        { id: "hot-retry", label: "Retry loading until the worker recovers" },
        {
          id: "reject-keep-last-good",
          label: "Reject it; keep the last known-good file and alert",
        },
      ],
      answer: "reject-keep-last-good",
    },
  ],
  diagnosis: `A database access-control change at 11:05 exposed table metadata. Because the feature-file query did not filter by database name, it started returning duplicate columns and building files larger than the bot module's fixed 200-feature allocation.

The ClickHouse cluster was being updated gradually, so each five-minute query run could still hit a not-yet-updated node and produce a good file, or an updated node and produce a bad one. That output was pushed network-wide immediately. Hence the five-minute oscillation. Once every node had been updated, the bad files became continuous and so did the outage.

The new proxy treated the oversized file as fatal: its Rust worker panicked on \`unwrap()\`, turning one invalid generated config into proxy 5xx. The old proxy avoided the crash but failed silently, scoring every request as zero — enough to trigger false positives for customers who block bots. The object-storage degradation was real, but adjacent: a symptom of the blast radius, not the cause.`,
  fix: `The immediate mitigation was to stop generating and propagating the bad file, insert a known-good file into the distribution queue, and restart the core proxy. Main impact resolved after that; remaining login, identity-proxy, and observability symptoms cleared as retries and degraded dependencies were drained.

The durable fix is to treat generated config as untrusted input:

| Fix | Tradeoff |
| --- | --- |
| Validate size, schema, and freshness before the global push | Adds latency to a path designed to be fast |
| Reject invalid files and keep the last known-good one | Bot rules can go stale, so staleness needs an alert |
| Canary and staged rollout of config files with automatic halt | New bot rules take longer to roll out |
| Add the explicit database-name filter to the query | Fixes this case, not other implicit assumptions |
| Add global kill switches and cap error reporting | More operator surface and more knobs to maintain |

Source: [Outage postmortem](https://blog.cloudflare.com/18-november-2025-outage/)`,
  rubric: [
    {
      text: "Connected the five-minute wave to a gradually changing database cluster, not to attacks or capacity",
      dim: "correctness",
    },
    {
      text: "Named the missing database filter and wider metadata visibility as the assumption that duplicated columns",
      dim: "process",
    },
    {
      text: "Carried the lesson through to last-known-good config serving, validation, and staleness alerting rather than stopping at the query bug",
      dim: "depth",
    },
  ],
  remember: [
    "A rollout that is not atomic from the writer's point of view is still a single rollout to the data it emits.",
    "Failing closed and failing silently are both bad; the safe default for generated config is fail static, serve the last known-good version, and alarm on staleness.",
    "Validate the artifact before the global push. A single database assumption should not be allowed to become every edge worker's crash.",
  ],
} satisfies Incident;

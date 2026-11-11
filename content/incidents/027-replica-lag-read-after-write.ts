import type { Incident } from "./types";

export const replicaLagReadAfterWrite = {
  slug: "replica-lag-read-after-write",
  title: "Order created successfully. The next request says it doesn't exist.",
  publishedAt: "2026-11-11",
  difficulty: "medium",
  topic: "databases",
  tags: ["postgres", "replication", "consistency", "read-after-write"],
  symptom:
    "Your checkout API returns 201 with a new order ID, then the browser redirects to that order's page. Some customers see a 404. Refreshing a few seconds later brings the order back. The problem started after GET requests were moved to a read pool to reduce primary load, and becomes much more frequent during the nightly bulk import. Checkout success rate stays green, and there are no failed inserts.",
  constraints: [
    "One PostgreSQL primary accepts writes; two asynchronous streaming replicas serve GET requests, selected independently for each request",
    "POST /orders commits before returning 201; the redirected GET uses a new transaction, with no application or CDN cache on this path",
    "A customer must be able to view an order immediately after creation; the order-detail latency budget is 300 ms",
    "The primary has capacity for order-detail reads, but moving the entire catalog and reporting workload back would overload it",
    "Replica replay usually trails the primary by less than 100 ms, but can fall several seconds behind during imports",
  ],
  evidence: [
    "For one affected order, the commit completes at 14:02:10.120 and the API returns 201 at 14:02:10.125; the redirected GET returns 404 at 14:02:10.180",
    "At 14:02:10.200, a fresh query on the primary finds the row, while the same query on replica B returns zero rows",
    "Replica B's replay position is still before that transaction's commit record; it passes the record at 14:02:13.400, after which the row is visible there",
    "Request traces show a successful GET on replica A followed by a 404 on replica B for the same order; no DELETE statement ran",
    "Routing only order-detail reads to the primary eliminates the 404s during a canary run, including during the import",
  ],
  question:
    "How can a committed order disappear between requests, what proves the cause, and how would you guarantee the immediate read without moving every read back to the primary?",
  picks: [
    {
      id: "missing-order",
      prompt: "Why does the first GET return 404 after a successful POST?",
      options: [
        { id: "early-response", label: "The API returns 201 before its transaction commits" },
        { id: "replica-replay", label: "The GET reaches a replica that has not replayed the committed write" },
        { id: "cached-miss", label: "A cached negative lookup hides the new row" },
        { id: "rollback", label: "The database rolls back the order after acknowledging the commit" },
      ],
      answer: "replica-replay",
    },
    {
      id: "disappears-again",
      prompt: "Why can a successful refresh be followed by another 404?",
      options: [
        { id: "delete", label: "A cleanup job deletes the row between requests" },
        { id: "old-snapshot", label: "Every GET reuses the same old transaction snapshot" },
        { id: "different-replica", label: "Requests switch between replicas at different replay positions" },
        { id: "duplicate-id", label: "Two orders share an ID and overwrite each other" },
      ],
      answer: "different-replica",
    },
    {
      id: "guaranteed-read",
      prompt: "Which immediate change meets the stated consistency and capacity constraints?",
      options: [
        { id: "sleep", label: "Wait a fixed 100 ms before redirecting to a replica" },
        { id: "more-replicas", label: "Add replicas and keep routing each GET randomly" },
        { id: "sticky-replica", label: "Pin each customer to one asynchronous replica" },
        { id: "primary-detail", label: "Route order-detail reads to the primary while retaining replicas for stale-tolerant workloads" },
      ],
      answer: "primary-detail",
    },
  ],
  diagnosis: `The order exists. The database answering the GET has not reached the point in history where it exists yet. The POST commits on the primary, and asynchronous replication lets that primary acknowledge the write without waiting for replicas to apply it. The browser can complete its redirect faster than a replica replays the transaction.

The timestamps rule out an early success response: the commit precedes the 201. The simultaneous primary and replica queries locate the disagreement, and the replay position explains it. The row becomes visible on replica B when B applies the commit record. There is no missing insert to retry.

Random read routing adds a second surprise. Replica A can show the order, then replica B can return an older view on the very next request. This violates the customer's expectation that once something has appeared it stays visible. Pinning the customer to one replica reduces that switching, but still cannot guarantee that their first read sees a write made on the primary.

The bulk import widens an existing race by increasing replay delay. A quiet staging system can pass thousands of tests simply because its replica catches up before the redirected request arrives. The contract was already wrong; the import makes the timing visible.

PostgreSQL documents the visibility delay of asynchronous streaming replication in its [standby documentation](https://www.postgresql.org/docs/current/warm-standby.html).`,
  fix: `Route order-detail reads to the primary first. The canary establishes that this removes the failures, and the capacity constraint makes it a viable mitigation. Keep catalog and reporting reads on replicas where a stale answer is acceptable. Preserve authorization checks on the order lookup whichever database serves it.

For a more selective design, carry a consistency token representing a WAL position at or after the successful commit. Before serving a dependent read from a replica, verify that this specific replica has replayed through that position, then start the read with a fresh snapshot. Wait only within the request's latency budget; fall back to the primary if the replica is still behind. This needs careful token capture, routing, and failover handling, so the simpler primary route is a reasonable durable choice for this endpoint.

| Approach | Tradeoff |
| --- | --- |
| Primary reads for order details | Straightforward read-after-write behavior, with additional primary traffic |
| Replay-position check with bounded wait and primary fallback | Keeps more reads on replicas, but adds coordination and failover complexity |
| Synchronous replication with remote_apply | Makes the commit wait for the configured synchronous replicas to apply it; adds write latency and can block writes when required replicas are unavailable. Reads must use a replica covered by that acknowledgment |
| Fixed delay or a short primary-stickiness timer | Can reduce failures, but a lag spike can outlast the timer; it is not a consistency guarantee |

Track replay progress per replica and record the database target in request traces. Add a create-then-read synthetic check through the actual production routing path. Test with deliberately delayed replica replay so success cannot depend on the usual sub-100 ms timing.`,
  rubric: [
    { text: "Used commit timing, database targets, and replay position to distinguish a stale read from a failed write or cached 404", dim: "process" },
    { text: "Explained both the initial missing row and the later regression when requests switch between replicas", dim: "correctness" },
    { text: "Chose a consistency guarantee that meets the latency and capacity constraints, and explained why a fixed delay or replica affinity is insufficient", dim: "depth" },
  ],
  remember: [
    "A successful commit on the primary does not mean an asynchronous replica can serve that write yet.",
    "Switching between replicas can make a customer's view move backward, even when every database is behaving as configured.",
    "Guarantee dependent reads with routing or verified replay progress. A timer only guesses when replication will catch up.",
  ],
} satisfies Incident;

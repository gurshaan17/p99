import type { Incident } from "./types";

export const oneStalledPartitionSilentLag = {
  slug: "one-stalled-partition-silent-lag",
  title: "One partition stopped moving at 11:02. Nothing alerted. Support did, at 14:41.",
  publishedAt: "2026-10-09",
  difficulty: "medium",
  topic: "platform",
  tags: ["partitions", "consumer-lag", "head-of-line-blocking", "dead-letter-queue", "retries"],
  symptom:
    "Your payments service publishes events to a 24-partition topic, and a consumer group sends payout notifications to customers. At 14:41, support reports that a small slice of customers, around 4%, have received no payout notifications since late morning, while everyone else is fine. Dashboards are green: consumers are up, CPU is idle, and nothing is crash-looping. Restarting the consumers briefly \"fixes\" nothing, and scaling the consumer group from 12 to 24 instances changes nothing either.",
  constraints: [
    "The topic has 24 partitions, keyed by account ID, so each account's events land in the same partition and are consumed in order",
    "12 consumers in one group, each owning two partitions; a partition is owned by exactly one consumer at a time",
    "The handler catches every exception and retries the same event after 5 seconds, with no retry limit",
    "Offsets are committed only after an event is processed successfully",
    "Total throughput is about 240 events per second, roughly 10 per partition",
    "Alerts: error rate above 5% of processed events, and total lag summed across all partitions above 250,000",
  ],
  evidence: [
    "Lag is zero on 23 partitions. On partition 17 it grows steadily and is at about 131,000 events",
    "The committed offset on partition 17 has been stuck at 8,412,903 for 3 hours 39 minutes; it has not moved at all",
    "One log line — `failed to process event, retrying` — repeats every 5 seconds against the same offset since 11:02",
    "That is about 0.2 errors per second against roughly 230 events per second processed overall, so the error rate is under 0.1%",
    "The event at offset 8,412,903 was produced by a back-office correction tool, run once, at 11:02. Its amount field is the string \"12,50\", while regular producers send a number",
    "After a restart, partition 17 moves to another consumer within seconds. The same offset starts failing again immediately",
    "With 24 consumers, 12 of them have no partitions assigned at all",
  ],
  question:
    "Why did one event stall 4% of customers, why couldn't restarts or extra consumers help, and what should the consumer and its monitoring do differently?",
  picks: [
    {
      id: "why-4-percent",
      prompt: "Why were only about 4% of customers affected?",
      options: [
        { id: "consumers-crashed", label: "4% of the consumers had crashed" },
        { id: "bad-instance", label: "The load balancer was sending 4% of traffic to a bad instance" },
        {
          id: "one-partition-stuck",
          label:
            "Events are keyed by account ID, so one partition of 24 holds roughly 4% of accounts, and in-order consumption means one stuck event blocks everything behind it",
        },
        { id: "premium-accounts", label: "Only premium accounts used that code path" },
      ],
      answer: "one-partition-stuck",
    },
    {
      id: "why-helpless",
      prompt: "Why didn't restarts or scaling to 24 consumers help?",
      options: [
        {
          id: "deterministic-stall",
          label:
            "The failure is deterministic and attached to one event, so reassignment moves the same stuck offset to another consumer, and consumers beyond the partition count sit idle",
        },
        { id: "slow-restarts", label: "The restarts were too slow" },
        { id: "rebalance-disabled", label: "Rebalancing is disabled in the group" },
        { id: "broker-cache", label: "The broker had cached the bad event" },
      ],
      answer: "deterministic-stall",
    },
    {
      id: "silent-alerts",
      prompt: "Why did no alert fire while a partition sat stuck for 3 hours 39 minutes?",
      options: [
        { id: "muted", label: "Alerts were muted" },
        { id: "crash-looping", label: "The consumers were crash-looping and masked the signal" },
        { id: "broker-down", label: "The broker was down" },
        {
          id: "aggregate-thresholds",
          label:
            "The alerts watched error rate and total lag summed across partitions. Both stayed under threshold, and nothing watched whether each partition's offset was advancing",
        },
      ],
      answer: "aggregate-thresholds",
    },
  ],
  diagnosis: `This is head-of-line blocking in an ordered, partitioned log. Ordering within a partition means the consumer can't skip ahead, and the handler's retry-forever loop turned one unparseable event into an indefinite stall for every account on that partition. Retrying can't fix an error that comes from the content of the event, so the retries only repeated the failure every five seconds.

Why it stayed invisible: the stall produced almost no errors — one slow error every five seconds, under 0.1% of throughput. The lag alert summed all partitions, so a 131,000-event backlog on one partition stayed below the 250,000 threshold. Consumer health checks passed because the consumers were alive and busy retrying. Restarts and extra consumers couldn't help because the failure is deterministic: the same offset fails on whichever consumer now owns it, and consumers beyond 24 have no partitions to take.`,
  fix: `The immediate mitigation is to park the bad event: copy it to a dead-letter topic for manual handling, then move the group's offset on partition 17 past it. The backlog drains from there. Resetting the whole group or recreating the topic throws away good events; adding consumers changes nothing.

The durable fixes:

| Fix | Tradeoff |
| --- | --- |
| Bounded retries with backoff; send permanent failures to a dead-letter topic with context, then commit the offset and alert | Ordering for that key is no longer guaranteed — later events for the same account may be processed before the parked one |
| Park by key, not by partition: set aside only the failing account and keep the rest of the partition flowing | More bookkeeping in the consumer, but a bad event blocks one account instead of 4% of them |
| Alert on per-partition lag and on an offset that hasn't advanced for N minutes | Needs per-partition metrics and a sensible N for quiet partitions |
| Validate schema at the producer, including the back-office tools | Another gate to maintain, but it stops the bad event at the source |
| More partitions or more consumers | Doesn't help: the blocked partition stays blocked, and adding partitions changes key-to-partition mapping |
`,
  rubric: [
    {
      text: "Connected the 4% to key-based partitioning with in-order consumption: one partition of 24, one stuck head",
      dim: "correctness",
    },
    {
      text: "Traced why the signals missed it: retry-forever kept errors under threshold, total-lag alert diluted one partition's backlog, health checks stayed green",
      dim: "process",
    },
    {
      text: "Carried the lesson through to dead-letter handling, per-partition offset-advance alerts, and producer-side validation rather than stopping at the bad event",
      dim: "depth",
    },
  ],
  remember: [
    "Ordering is a queue's promise and its hazard: one unprocessable message can stall every message behind it for the same key.",
    "Retrying forever is not resilience. A retry loop only tells you the failure is permanent; it needs a bounded count and somewhere to park the event.",
    "Aggregate alerts hide single-partition stalls. Watch whether each partition's offset advances, not just how far the totals are behind.",
  ],
} satisfies Incident;

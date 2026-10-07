import type { Incident } from "./types";

export const clockStepBackwardDuplicateIds = {
  slug: "clock-step-backward-duplicate-ids",
  title: "Duplicate primary keys on one node, for about two seconds, once a month",
  publishedAt: "2026-10-08",
  difficulty: "medium",
  topic: "runtime",
  tags: ["clocks", "id-generation", "ntp", "upsert", "silent-corruption"],
  symptom:
    "Your order service generates 64-bit IDs in the application, with no database sequence. At 03:14:07 UTC, 231 inserts into orders fail with duplicate-key errors, all within a two-second window. Then everything is fine. The same thing happened five weeks ago, and nobody found a cause. This time a reconciliation job also reports that some rows in order_events don't match their parent orders. Nothing was deployed, and the error window is gone before anyone can attach a debugger.",
  constraints: [
    "12 app nodes, each generating IDs locally with no coordination",
    "ID layout: 41 bits of millisecond timestamp, 10 bits of node ID, 12 bits of per-millisecond sequence, reset to zero whenever the millisecond changes",
    "Each node issues about 600 IDs per second",
    "orders uses plain inserts; order_events uses an upsert (ON CONFLICT (id) DO UPDATE) for idempotent writes",
    "Nodes are VMs on a cloud provider that does live migration for host maintenance",
    "Time sync is a standard NTP client with default settings",
  ],
  evidence: [
    "All 231 duplicate-key errors come from requests handled by node 9, between 03:14:07.0 and 03:14:08.8; the other 11 nodes show nothing unusual",
    "At 03:14:05, the cloud provider's event log shows a live migration of node 9's VM",
    "Node 9's logs show the system clock stepped backward by about 1.8 seconds shortly after the VM resumed",
    "IDs issued by node 9 in the failing window decode to timestamps about 1.8 seconds earlier than real time",
    "For 41 events, the stored row now belongs to a different order than the one that originally wrote it, and no error was logged for those writes",
    "The ID generator reads the wall clock for every ID and doesn't compare it to the last timestamp it used",
  ],
  question:
    "Why did only one node produce duplicates, and why were the upserted rows worse than the failed inserts?",
  picks: [
    {
      id: "why-duplicates",
      prompt: "What caused the duplicate IDs?",
      options: [
        { id: "same-node-id", label: "Two nodes were configured with the same node ID" },
        { id: "sequence-overflow", label: "The per-millisecond sequence overflowed" },
        {
          id: "clock-backward",
          label:
            "The clock moved backward, so the generator replayed (timestamp, node, sequence) combinations it had already issued",
        },
        { id: "clock-skew", label: "Node 9's clock was simply fast" },
      ],
      answer: "clock-backward",
    },
    {
      id: "why-one-node",
      prompt: "Why did only node 9 produce duplicates?",
      options: [
        { id: "most-traffic", label: "Node 9 handles the most traffic" },
        {
          id: "only-node-9-stepped",
          label:
            "Only node 9's clock stepped backward, and the node-ID bits keep each node's ID space separate from the others",
        },
        { id: "slow-disk", label: "Node 9's disk was slower" },
        { id: "lb-favored", label: "The load balancer favored node 9" },
      ],
      answer: "only-node-9-stepped",
    },
    {
      id: "upsert-worse",
      prompt: "Why were the 41 overwritten events more dangerous than the 231 errors?",
      options: [
        { id: "bigger-rows", label: "They were larger rows" },
        {
          id: "silent-overwrite",
          label:
            "The upsert treated a collision as a retry and overwrote an unrelated row, so data was corrupted with no signal",
        },
        { id: "db-layer", label: "The errors happened in the database layer" },
        { id: "at-night", label: "They happened at night" },
      ],
      answer: "silent-overwrite",
    },
  ],
  diagnosis: `The ID scheme assumes time only moves forward. When node 9's clock stepped back 1.8 seconds, the generator re-entered milliseconds it had already used, restarted the sequence at zero, and produced (timestamp, node, sequence) tuples it had already issued. Every other node was unaffected because the node-ID bits partition the ID space.

The loud case is the plain insert, which fails with a duplicate key. The dangerous case is the upsert: it treats a collision as "this is a retry of the same write" and overwrites an unrelated row. Idempotency keyed on an ID only works if the ID is unique, so a uniqueness bug becomes silent data corruption there.

The incident was a surprise because it needs a node pause plus a backward clock step — rare, about once a month — and the error window lasts seconds. Staging has neither live migration nor real traffic, so it never reproduces.`,
  fix: `Immediate mitigation is to fence or restart the affected node so its generator stops issuing IDs against the stepped clock, and to reconcile order_events rows that were overwritten. No code rollback can recover the corrupted events.

The durable fixes:

| Fix | Tradeoff |
| --- | --- |
| Track the last timestamp used; on earlier reads, wait out small drift and refuse to issue IDs on a large one | Small stalls on small drift, visible failures on large jumps — far better than silent duplicates |
| Configure time sync to slew rather than step, except at boot | Slower correction of large offsets; a bad boot-time clock still needs handling |
| Alert on clock offset and on backward jumps, per node | Needs time monitoring with thresholds that don't page on noise |
| Restart or fence the generator after a VM pause | Needs a hook into the VM-resume path |
| Retry with a fresh ID on unique violation | Fixes plain inserts but hides the root cause and does nothing for upserts |
| Use database-issued IDs | Removes the clock dependency, at the cost of a round trip and a shared bottleneck |
`,
  rubric: [
    {
      text: "Identified the backward clock step replaying (timestamp, node, sequence) tuples as the duplicate-ID source",
      dim: "correctness",
    },
    {
      text: "Explained why only node 9 was affected, why it is rare and brief, and why staging never reproduces it",
      dim: "process",
    },
    {
      text: "Called out the upsert turning a uniqueness bug into silent corruption, and carried the lesson to last-timestamp tracking, slew-only NTP, and pause fencing",
      dim: "depth",
    },
  ],
  remember: [
    "An ID scheme built on wall-clock time must handle time moving backward; assuming monotonicity is the bug.",
    "Idempotency keyed on an ID inherits the uniqueness assumption of that ID. A collision in an upsert is silent data loss, not an error.",
    "Rare plus brief plus no staging reproduction is the signature of environment-dependent faults; the fix lives in the generator's assumptions and the time sync, not in the error path.",
  ],
} satisfies Incident;

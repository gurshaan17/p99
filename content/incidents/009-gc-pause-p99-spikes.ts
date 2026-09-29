import type { Incident } from "./types";

export const gcPauseP99Spikes = {
  slug: "gc-pause-p99-spikes",
  title: "CPU graph says 45%. p99 latency says otherwise.",
  publishedAt: "2026-09-27",
  difficulty: "hard",
  tags: ["jvm", "garbage-collection", "latency"],
  symptom:
    "A Java service on G1GC shows moderate average CPU (40-50%) — nothing alarming on the dashboard. But p99 latency has recurring spikes of 200-500ms every few seconds, invisible in the average, and users are noticing timeouts.",
  constraints: [
    "JVM service, G1GC with default tuning, fixed heap size",
    "High allocation rate: request handlers create many short-lived DTOs and do string concatenation in the hot path",
    "GC logs are enabled and available",
    "Request rate is steady, no traffic spikes correlate with the latency spikes",
  ],
  evidence: [
    "GC logs show frequent young-generation collections, with pause durations growing over the service's uptime",
    "Latency spike timestamps line up exactly with GC pause events in the GC log, to the millisecond",
    "Allocation rate (bytes/sec, from JFR or GC logs) is very high relative to the service's actual throughput",
    "Average CPU looks fine because GC pauses are infrequent relative to total time — they dominate the tail, not the mean",
  ],
  question: `How do you confirm GC is the cause before changing any tuning flags, and what's actually driving the pause frequency?`,
  picks: [
    {
      id: "first-check",
      prompt: "What would you check first?",
      options: [
        { id: "heap-dump", label: "Take a heap dump and inspect object counts" },
        {
          id: "gc-log-correlate",
          label: "Correlate GC log pause timestamps with the latency spike timestamps",
        },
        {
          id: "increase-heap",
          label: "Just increase the heap size and see if it helps",
        },
        { id: "thread-dump", label: "Take a thread dump during a spike" },
      ],
      answer: "gc-log-correlate",
    },
    {
      id: "root-cause",
      prompt: "What's actually driving the pause frequency?",
      options: [
        { id: "heap-too-small", label: "Heap is undersized for the workload" },
        {
          id: "alloc-rate",
          label: "Allocation rate is too high, filling young gen too fast",
        },
        { id: "old-gen-leak", label: "A memory leak in old gen" },
        { id: "thread-count", label: "Too many application threads" },
      ],
      answer: "alloc-rate",
    },
  ],
  diagnosis: `Average CPU is a mean across all time, so infrequent but real stop-the-world pauses barely move it — a 300ms pause every 3 seconds is ~10% of time spent paused, easily lost in an averaged CPU graph, but devastating to p99 because every request in flight during that window gets delayed by the full pause duration.

The high allocation rate is the actual driver: short-lived DTOs and string concatenation in the hot path fill the young generation quickly, forcing frequent young-gen collections. As fragmentation and promotion pressure build, pause times creep up. This is confirmed, not assumed, by the exact timestamp correlation between GC log pauses and latency spikes — without that correlation, "GC is the cause" is a guess, not a diagnosis.`,
  fix: `- **Reduce allocation pressure first**: profile allocation hot spots (async-profiler or JFR), replace hot-path string concatenation with \`StringBuilder\` or avoid it entirely, pool/reuse DTOs where feasible instead of allocating per request.
- **Tune G1 pause target** (\`-XX:MaxGCPauseMillis\`) down, understanding this trades pause length for pause frequency, not a free win.
- **Increase young-gen size** to reduce collection frequency if allocation rate can't be reduced further.
- Avoid jumping straight to "just add more heap" — a bigger heap without addressing allocation rate often means longer (if less frequent) pauses, not a fix.`,
  rubric: [
    {
      text: "Went to GC logs / timestamp correlation before touching tuning flags",
      dim: "process",
    },
    {
      text: "Identified allocation rate, not heap size, as the actual driver",
      dim: "correctness",
    },
    {
      text: "Explained why average CPU hides tail-latency pause impact",
      dim: "depth",
    },
    {
      text: "Didn't recommend 'just increase heap' as the fix",
      dim: "depth",
    },
  ],
} satisfies Incident;

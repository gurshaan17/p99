import type { Incident } from "./types";

export const retryAmplificationBrownoutToOutage = {
  slug: "retry-amplification-brownout-to-outage",
  title: "A 4-minute brownout became a 29-minute outage. Every layer retried correctly.",
  publishedAt: "2026-10-11",
  difficulty: "medium",
  topic: "platform",
  tags: ["retries", "retry-budget", "amplification", "backoff", "load-shedding"],
  symptom:
    "Your mobile app calls an edge API, which calls the checkout service, which calls the pricing service, which reads a pricing database. At 10:15 the pricing database begins a heavy maintenance compaction, and about 20% of pricing requests start failing with 503s. That's survivable, and each layer retries. For the first minute the user-facing error rate is nearly zero. At 10:19 the compaction ends and the database returns to normal. Pricing's error rate keeps climbing anyway, from 20% to 80% by 10:22 and to 100% by 10:30. User traffic is flat, so no one is attacking you and nothing new was deployed.",
  constraints: [
    "Call chain: mobile app → edge API → checkout → pricing → pricing database",
    "User-facing traffic is steady at about 1,000 requests per second",
    "Pricing is healthy up to about 1,800 rps; above roughly 2,500 rps, latency passes the callers' timeouts, most work is wasted, and goodput falls. During the compaction its effective capacity drops to roughly 800 rps",
    "Every layer retries up to 3 attempts total on timeouts and 5xx, with exponential backoff and full jitter. All price lookups are idempotent",
    "Three teams own the three retry configs, and each looked reasonable on its own",
    "No circuit breakers, no load shedding, and no retry budgets. Pricing returns a bare 503 with no Retry-After or \"do not retry\" signal",
  ],
  evidence: [
    "User-facing request rate is flat at about 1,000 rps for the whole incident",
    "Inbound rate at pricing is 1,000 rps at 10:14, 1,240 at 10:16, and about 5,000 at 10:22",
    "Pricing's error rate is about 20% from 10:15 to 10:19, about 80% at 10:22, and 100% at 10:30",
    "The pricing database's latency is back to normal at 10:20. The 503s continue",
    "Counting attempts at the pricing service per user request gives about 1.25 at 10:16 and about 5.0 at 10:22",
    "Pricing's logs can't distinguish first attempts from retries; they look identical",
    "Checkout p99 latency climbs to about 10 seconds, and its thread pool is full of requests waiting on pricing",
  ],
  question:
    "Why did a failure that ended at 10:19 keep getting worse until 10:30, why didn't backoff and jitter prevent it, and what limits the damage next time?",
  picks: [
    {
      id: "amplification",
      prompt: "At the peak, roughly how many pricing attempts does one user request cause, and why?",
      options: [
        { id: "one-point-two", label: "About 1.2x, because only 20% of requests were failing" },
        {
          id: "about-five",
          label: "About 5x, because retries multiply across three layers and the failure rate rose under load",
        },
        { id: "exactly-27", label: "Exactly 27x in every incident" },
        { id: "about-one", label: "About 1x, because backoff spreads requests out" },
      ],
      answer: "about-five",
    },
    {
      id: "stayed-down",
      prompt: "Why did pricing stay down after its database recovered?",
      options: [
        { id: "cache-warmup", label: "The database cache needed hours to warm up" },
        { id: "cached-503", label: "Clients cached the 503 responses" },
        {
          id: "over-offered-load",
          label:
            "Offered load stayed far above pricing's capacity, so most requests still timed out, which kept the failure rate high and the retries flowing",
        },
        { id: "dns", label: "DNS still pointed at the failed node" },
      ],
      answer: "over-offered-load",
    },
    {
      id: "retry-budget",
      prompt: "What is a retry budget, and what does it do here?",
      options: [
        { id: "hard-cap", label: "A hard cap of 3 attempts per request" },
        { id: "daily-quota", label: "A daily quota of retries per customer" },
        { id: "fixed-delay", label: "A fixed delay before every retry" },
        {
          id: "fraction-cap",
          label:
            "A cap on retries as a fraction of recent requests per client, say 10%, so three budgets give about 1.1³ ≈ 1.33x worst case instead of up to 27x",
        },
      ],
      answer: "fraction-cap",
    },
  ],
  diagnosis: `Each layer's retry policy was reasonable alone. Together they multiply. With 3 attempts at each of 3 layers, the worst case is 3 × 3 × 3 = 27 pricing attempts per user request. The real number depends on the failure rate, because a layer retries only when the call below it fails.

With the failure rate p per pricing attempt: at p = 0.2, checkout makes 1 + 0.2 + 0.04 = 1.24 attempts, its calls fail only 0.8% of the time, and the layers above add almost nothing — about 1.25x, or 1,250 rps. At p = 0.8, checkout makes 2.44 attempts and fails 51% of the time; the edge then makes about 1.77 checkout calls and fails 13% of the time; the app makes about 1.15 edge calls. Total ≈ 2.44 × 1.77 × 1.15 ≈ 5.0x, or about 5,000 rps.

During the compaction pricing's capacity was about 800 rps, so 1,250 rps pushed the failure rate up, which pushed load up, which pushed the failure rate up again. After the compaction ended, capacity was back to 1,800 rps, but the offered 5,000 rps was well above it and past the point where goodput collapses. Backoff and jitter only delay and spread retries; the number of attempts per request stays the same, so sustained overload persists. The system sat in a self-sustaining overload until load was cut.`,
  fix: `The fastest safe mitigation is to cut offered load: disable retries at the edge and checkout with a config flag, drop the app's attempts to one via remote config, and shed or rate-limit at the edge. Offered load falls to about 1,000 rps and pricing recovers within minutes. Restarting pricing or raising timeouts does nothing while the load is still amplified.

The durable fixes:

| Fix | Tradeoff |
| --- | --- |
| Per-client retry budgets (retries ≤ ~10% of recent requests) | A few legitimate retries get denied during real blips, so you need a small minimum allowance at low traffic |
| Retry at one layer only | Simple and predictable, but the other layers lose their own recovery from transient errors |
| Load shedding at pricing, with a \"don't retry\" or Retry-After signal | Callers must honor the signal, and some requests are rejected on purpose |
| Circuit breakers | Can open too eagerly and need tuning, and they add state to every client |
| Mark attempts (attempt number or retry flag) | Lets pricing prioritize first attempts, at the cost of a protocol change across teams |
| Only retry idempotent, retryable errors | Needs per-endpoint classification, and a mistake duplicates writes |

Envoy and Finagle both implement retry budgets, from memory; check their docs and defaults before quoting numbers.
`,
  rubric: [
    {
      text: "Explained retry multiplication across layers and why the multiplier itself grew with the failure rate",
      dim: "correctness",
    },
    {
      text: "Separated the database maintenance (4 minutes) from the self-sustaining overload that outlived it, and explained why backoff and jitter couldn't break it",
      dim: "process",
    },
    {
      text: "Reached retry budgets, single-layer retry, load shedding with a don't-retry signal, and attempt marking as the fixes, with mitigation being to cut offered load",
      dim: "depth",
    },
  ],
  remember: [
    "Retries multiply across layers. Three layers with three attempts each is a worst case of 27 attempts per user request, not 3.",
    "Backoff and jitter change when retries happen, not how many. Under sustained overload, the offered load is the outage.",
    "Bound retries as a fraction of traffic, retry at one layer, and tell callers when not to retry. Amplification is a design property, not a tuning knob.",
  ],
} satisfies Incident;

import type { Incident } from "./types";

export const livenessProbeCascadingRestarts = {
  slug: "liveness-probe-cascading-restarts",
  title:
    "Traffic spikes. Pods start dying. Healthy pods, killed by their own cluster.",
  publishedAt: "2026-09-26",
  difficulty: "hard",
  topic: "platform",
  tags: ["kubernetes", "cascading-failure", "load-shedding"],
  symptom:
    "A Kubernetes service scales fine most of the time. But during traffic spikes, pod restart counts climb sharply, available replica count actually DROPS during the spike, and the outage gets worse before it recovers — the opposite of what autoscaling should do.",
  constraints: [
    "Liveness probe on /healthz, timeoutSeconds=1, periodSeconds=5, failureThreshold=1",
    "The /healthz handler runs on the same request-handling thread pool/event loop as regular traffic",
    "HPA scales on CPU",
    "No OOM kills or crash logs during these events — kubectl describe shows 'Liveness probe failed' as the restart reason",
  ],
  evidence: [
    "Restart spikes correlate tightly with traffic spikes, not with any crash or OOM event in logs",
    "Available healthy replica count drops during the highest-traffic windows, exactly when more capacity is needed",
    "In a canary test, raising timeoutSeconds to 5 and failureThreshold to 3 under identical traffic produced zero restarts",
  ],
  question:
    "Why would a healthy, merely busy pod get killed, and why does that make the situation worse rather than better?",
  picks: [
    {
      id: "root-cause",
      prompt: "What's actually happening?",
      options: [
        { id: "real-crash", label: "The pods are genuinely crashing under load" },
        {
          id: "probe-conflated",
          label: "The liveness probe conflates 'busy' with 'unhealthy'",
        },
        { id: "hpa-misconfig", label: "HPA scaling thresholds are set wrong" },
        { id: "oom", label: "Pods are being OOM-killed" },
      ],
      answer: "probe-conflated",
    },
    {
      id: "why-cascades",
      prompt: "Why does this make the outage worse, not better?",
      options: [
        {
          id: "fewer-pods",
          label: "Killing busy pods reduces total capacity right when more is needed, pushing more load onto remaining pods",
        },
        { id: "restart-cost", label: "Restarts themselves consume significant CPU" },
        { id: "dns-cache", label: "DNS caching causes stale routing to dead pods" },
        { id: "network", label: "Network partitions during restarts" },
      ],
      answer: "fewer-pods",
    },
  ],
  diagnosis: `Under load, request-handling threads get busy, and because /healthz shares that same pool, the health check response itself gets delayed past the 1-second timeout — not because the app is broken, but because it's legitimately doing work. With \`failureThreshold: 1\`, a single slow health check is enough to get the pod killed.

This creates a feedback loop: killing a busy-but-healthy pod removes capacity exactly when the remaining pods need it most, increasing load on survivors, making their health checks more likely to time out too — a self-inflicted cascading restart storm that looks like the traffic is "causing crashes" but is actually the cluster killing its own healthy capacity.`,
  fix: `- **Decouple the health endpoint from the busy request-handling path**: serve it from a separate lightweight handler or thread that isn't queued behind regular traffic, or have it check a fast in-memory "am I initialized and not deadlocked" flag rather than doing real work.
- **Loosen the probe**: increase \`timeoutSeconds\` and \`failureThreshold\` so a momentary slowdown under load isn't treated as a crash.
- **Use readiness probes for load-shedding, liveness probes for actual deadlock/crash detection** — these are different concerns and conflating them is the root design mistake here, not just the specific numbers chosen.`,
  rubric: [
    {
      text: "Recognized 'busy' was being treated as 'unhealthy'",
      dim: "correctness",
    },
    {
      text: "Explained the feedback loop (fewer pods → more load → more failures)",
      dim: "depth",
    },
    {
      text: "Distinguished the role of liveness vs readiness probes",
      dim: "depth",
    },
    {
      text: "Used the canary test result as confirming evidence",
      dim: "process",
    },
  ],
} satisfies Incident;

import type { Incident } from "./types";

export const idempotencyKeyDoubleCharge = {
  slug: "idempotency-key-double-charge",
  title: "Support is full of tickets. Some customers were charged twice, and some were charged once but have no order.",
  publishedAt: "2026-09-24",
  difficulty: "hard",
  topic: "databases",
  tags: ["idempotency", "payments", "retries", "distributed-systems"],
  symptom:
    "POST /orders charges the customer's card through a third-party payment provider and then inserts an order row. On flaky mobile networks, users tap \"Place order\", see a spinner for 5 seconds, and the app auto-retries up to 3 times. Support is now flooded: some customers have two charges and two orders for one intent, and some have one charge and no order at all.",
  constraints: [
    "One Go API service, 3 instances behind a load balancer; one Postgres primary",
    "300 orders/sec at peak",
    "Payment provider p50 400ms, p99 6s, occasionally times out after 10s",
    "Client timeout is 5s with up to 3 automatic retries, and a retry can land on any instance",
    "The provider supports an idempotency-key header, but the current code never sends one",
    "Order rows must never be duplicated, and a customer must never be charged twice for one intent",
    "The API must stay available when the provider is slow — no unbounded waiting",
  ],
  evidence: [
    "Duplicated orders always have two different order IDs and two separate provider charge IDs, within seconds of each other, for the same user and amount",
    "The charged-but-no-order cases cluster around requests that took 5–10s, i.e. where the client gave up and the server was still working",
    "Restarts and deploys during the incident window line up with several of the charged-without-order tickets",
    "No request ever carried an idempotency key, so the provider had no way to recognise a repeat of the same charge",
  ],
  question:
    "Redesign POST /orders so that retries are safe. What identifies one intent across three instances, and where does a charge get reconciled when the process dies mid-call?",
  picks: [
    {
      id: "root-cause",
      prompt: "Where do these two failures actually come from?",
      options: [
        {
          id: "no-shared-identity",
          label: "No shared identity for an intent, so concurrent retries both pass the check and both charge",
        },
        { id: "provider-bug", label: "The payment provider is double-charging on its own" },
        { id: "network-retry", label: "The network layer is retrying requests it shouldn't" },
        { id: "pg-failover", label: "Postgres failover is losing committed order rows" },
      ],
      answer: "no-shared-identity",
    },
    {
      id: "crash-window",
      prompt: "Why can a charge succeed with no order row at all?",
      options: [
        {
          id: "between-steps",
          label: "The process dies in the gap between the provider succeeding and the insert — a side effect no transaction can roll back",
        },
        { id: "insert-failed", label: "The insert failed and the error was swallowed" },
        { id: "replica-lag", label: "A read replica lagged and missed the row" },
        { id: "wrong-tenant", label: "The row was written under the wrong user" },
      ],
      answer: "between-steps",
    },
    {
      id: "arbiter",
      prompt: "What atomically decides that a request is the first to see this intent?",
      options: [
        {
          id: "unique-index",
          label: "A unique index on the idempotency key in Postgres, claimed with INSERT ... ON CONFLICT",
        },
        { id: "in-process-lock", label: "A mutex in the handler" },
        { id: "redis-setnx", label: "A Redis SETNX lock with a TTL" },
        { id: "sticky-sessions", label: "Sticky sessions so all retries hit one instance" },
      ],
      answer: "unique-index",
    },
    {
      id: "retry-window",
      prompt: "Retry #2 arrives on a different instance while #1 is still waiting on the provider. What should it do?",
      options: [
        {
          id: "return-pending",
          label: "Return in-progress from the stored pending row and do not charge",
        },
        { id: "wait-then-charge", label: "Wait for #1 to finish, then charge if it failed" },
        { id: "charge-again",          label: "Charge anyway — the provider will de-duplicate it" },
        { id: "take-over", label: "Take over the row and become the charger" },
      ],
      answer: "return-pending",
    },
  ],
  diagnosis: `Both failures are the same root cause wearing two faces: **the request has no identity**, so nothing in the system can tell a retry from a new order.

The double charge is a race. Request #1 charges, then inserts. The client times out at 5s — while the provider is still working, since p99 is 6s — and the retry arrives, possibly on a different instance. With no shared identity and no claim, the retry runs the same two steps independently and charges again. An in-process lock cannot help: a mutex on instance A says nothing about instance B. And the provider cannot de-duplicate either, because the code never sends an idempotency key, so a second charge is a genuinely new charge from its point of view.

The charged-but-no-order case is a crash window. The charge is an *external side effect*; the insert is a local transaction. Between "provider says yes" and "row committed" there is a gap in which the process can die, the deploy can roll, or the pod can be evicted. A database transaction cannot close it, because the transaction cannot include the provider's call — and even if it could, the money would still have moved. This is the one failure mode in the whole system where the fix is not "make the transaction bigger".

The design follows from those two facts. **The client generates the idempotency key** (a UUID, once per user intent, reused on every retry) because the server cannot distinguish a retry from a new order on its own — by the time a request arrives, all it has is a payload that looks identical either way. The key travels in the request.

**Postgres arbitrates.** An \`orders\` row with a \`UNIQUE\` index on \`idempotency_key\` is the single source of truth, claimed with \`INSERT ... ON CONFLICT (idempotency_key) DO NOTHING\`. Exactly one request wins. The loser reads the stored row and branches on its status: \`pending\` and recent → return 202/409 "in progress" and do not charge; \`completed\` → return the stored response; \`failed\` → return the stored failure. The same key with a different payload is a client bug and gets a 422, checked by comparing a \`request_hash\`.

**The winner passes its own key to the provider**, which turns the one unsafe call into a safely retryable one. The reconciler closes the crash window: any row \`pending\` for more than ~30s is resolved by asking the provider with that same key — the true outcome, never an assumption.`,
  fix: `- **Client generates a UUID per intent and reuses it on every retry.** The server cannot invent it, because it cannot tell a retry from a new order otherwise.
- **Claim the key in Postgres first**: \`idempotency_key UNIQUE\`, inserted with \`ON CONFLICT DO NOTHING\` and \`status = 'pending'\`. The unique index decides the winner, not application code.
- **Send that same key to the provider as its idempotency key.** Now re-calling it after a crash returns the original result instead of charging again — this is the only thing that makes the external call retryable.
- **Do not hold a transaction or connection open across the provider call.** 400ms to 10s per order at 300/sec would exhaust the pool. Write \`pending\`, release, charge, then write \`completed\` with \`payment_ref\` in one statement.
- **Branch the loser on stored state**: \`pending\` → 202 and no charge; \`completed\` → replay the stored response; \`failed\` → replay the failure. Compare \`request_hash\` and 422 a mismatched payload.
- **Reconcile stuck rows.** A job scans \`pending\` beyond ~30s, asks the provider with the same key, and settles the row on the answer. Daily reconciliation against the provider's settlement report as a backstop, and before the provider's key-retention window expires.
- **Bound the wait**: provider timeout under the stuck-row threshold, plus a circuit breaker, so a slow provider fails fast instead of piling up goroutines. The API stays available; the reconciler does the slow part.
- **Build the index with \`CREATE INDEX CONCURRENTLY\`** and deploy schema first, so no rewrite or lock is needed to ship.`,
  remember: [
    "An external side effect cannot be rolled back, so make it idempotent instead of trying to make it atomic. There is no transaction that spans a third-party API.",
    "Let the database's unique constraint decide who wins a race. In-process locks and check-then-act both fail the moment there is more than one server.",
    "Persist state before the risky step, then reconcile. \"Unknown outcome\" after a timeout is a normal state to design for, not an edge case — and never assume an unknown outcome, ask the provider.",
  ],
  rubric: [
    {
      text: "Traced both symptoms to one root cause: the request has no shared identity",
      dim: "correctness",
    },
    {
      text: "Named the crash window between the external charge and the local insert as unfixable by a wider transaction",
      dim: "depth",
    },
    {
      text: "Put the claim in a unique index rather than a lock or a cache",
      dim: "correctness",
    },
    {
      text: "Rejected holding a transaction open across the provider call, on pool-exhaustion grounds",
      dim: "depth",
    },
    {
      text: "Included a reconciler that asks the provider rather than inferring the outcome",
      dim: "process",
    },
  ],
} satisfies Incident;

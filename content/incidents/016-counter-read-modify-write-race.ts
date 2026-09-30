import type { Incident } from "./types";

export const counterReadModifyWriteRace = {
  slug: "counter-read-modify-write-race",
  title:
    "100,000 requests in. The counter says 97,832 — every run, a different shortfall.",
  publishedAt: "2026-10-01",
  difficulty: "medium",
  topic: "runtime",
  tags: ["go", "concurrency", "race-condition", "atomics", "runtime"],
  symptom:
    "A single `counter++` in a Go HTTP handler backs a site-wide hit counter. Under load it is never exact: 100,000 requests produce 97,832 the first run, 98,041 the second. The shortfall changes every run and is never above the true count. No database, no unharnessed resource — just one shared `int` and the default net/http server.",
  constraints: [
    "Go's default `net/http` server: one goroutine per incoming request — nothing pools or serializes handlers",
    "Load test sends exactly 100,000 requests with high concurrency — thousands in flight at once",
    "Single machine, multi-core",
    "No locks, no atomics, no channels: the handler is exactly the shown `counter++`",
    "The counter must be exactly correct, and the fix is not acceptable without naming the mechanism",
  ],
  evidence: [
    "Two identical load runs land on different shortfalls (97,832 then 98,041), and neither ever exceeds 100,000",
    "`go build -race` reports an unsynchronized read/write on `counter` on the first request batch",
    "amd64 disassembly of the handler shows three instructions for the increment: a load into a register, an add of one, and a store back — not a single in-memory increment",
    "Verified at low concurrency (one request at a time) the counter is exact for all 100,000 — the loss scales with overlap, not with volume",
  ],
  question:
    "`counter++` looks like one operation in the source. It is not one at the machine level — walk through what the CPU actually does, where two goroutines can interleave, why the loss only shows under concurrency and varies run to run, and how you would fix it and at what cost.",
  picks: [
    {
      id: "one-instruction",
      prompt: "At the machine level, what does `counter++` actually do?",
      options: [
        {
          id: "single-alu",
          label: "One instruction — the source line lowers to a single ALU op on the value",
        },
        {
          id: "read-modify-write",
          label: "A read-modify-write: load the value, add one, write it back — one line, three steps",
        },
        {
          id: "two-steps",
          label: "Two steps: read and write, with the increment fused into the store",
        },
        {
          id: "single-cycle",
          label: "One CPU cycle: the hardware increments the memory cell in place",
        },
      ],
      answer: "read-modify-write",
    },
    {
      id: "interleave-point",
      prompt: "At which point can two goroutines interleave?",
      options: [
        {
          id: "scheduler-serializes",
          label: "They can't — the goroutine scheduler hands access to shared variables to one goroutine at a time",
        },
        {
          id: "between-read-write",
          label: "Between the read and the write: both load the same value, both add one, both store — one increment is silently lost",
        },
        {
          id: "torn-write",
          label: "At the store, when two writes to the same cache line tear and corrupt the stored value",
        },
        {
          id: "function-boundary",
          label: "Never inside a call — goroutines only interleave across function boundaries, not within one",
        },
      ],
      answer: "between-read-write",
    },
    {
      id: "shortfall-variance",
      prompt: "Why does the counter land short every run, with a different shortfall each time?",
      options: [
        {
          id: "fixed-share",
          label: "A fixed share is lost every run; 97,832 vs 100,000 is just rounding in the load tester",
        },
        {
          id: "dropped-connections",
          label: "The kernel drops connections at high concurrency, so exactly 2,168 never reached the handler",
        },
        {
          id: "overlap-scheduling",
          label: "Each shortfall equals one overlapping read-modify-write; how many overlap is scheduler timing, which differs each run",
        },
        {
          id: "gc-heap-compaction",
          label: "The GC compacts the heap and restores the variable to an earlier value, so the loss tracks GC frequency",
        },
      ],
      answer: "overlap-scheduling",
    },
    {
      id: "fix-and-cost",
      prompt: "What correctly fixes it, and what does the fix cost on x86-64?",
      options: [
        {
          id: "channel-owner",
          label: "A channel owned by one goroutine; sends are lock-free, so it is the fastest option at high concurrency",
        },
        {
          id: "bigger-machine",
          label: "A bigger machine — more cores mean the read-modify-write windows stop overlapping",
        },
        {
          id: "compiler-barrier",
          label: "A compiler barrier so the load can't be cached and the store always lands fresh",
        },
        {
          id: "atomic-add",
          label: "An atomic add — one LOCK XADDQ; the hardware guarantees the read-modify-write, at the price of cache-line contention",
        },
      ],
      answer: "atomic-add",
    },
  ],
  diagnosis: `**The source lies about the instruction count.** Go lowers \`counter++\` to a load, an add, and a store — roughly \`MOVQ counter, r\`, \`ADDQ $1, r\`, \`MOVQ r, counter\` on amd64. Go's compiler deliberately does not fuse this into one in-memory increment, but the "one instruction" story would not save you anyway: a memory-form \`INC\` is itself a read-modify-write between the load and the store, and on x86 it is only cross-core atomic with a \`LOCK\` prefix. The increment is one source line and at least three internal steps, and the CPU has no way to know the three belong together.

**Where the increment disappears.** Each goroutine runs the same sequence. The scramble is between the load and the store: goroutine A loads 10, goroutine B loads 10, A stores 11, B stores 11. Both goroutines ran \`counter++\`, the counter moved by one, and one increment never happened. N goroutines can pile into the same window on the same value, collapsing N increments into one — which is why the shortfall can be thousands while the volume is a hundred thousand.

**Why it is a lost update, not a torn one.** On x86-64 an aligned 64-bit load or store completes atomically at the hardware level, so the stored value never gets ripped apart into garbage — the marker of this symptom is a clean, *never-above-true* number, not 48,2xx or a hash of both words. The race is in the composite read-modify-write, which any number of cores can interleave because there is nothing binding one goroutine's load to its store. (A 32-bit \`int\` on a 32-bit or ARM build can additionally tear reads, but the lost update exists regardless of word size — the fix is the same.)

**Why concurrency makes it visible, and why the number moves.** One request at a time: no overlap, exact for all 100,000 — the evidence holds because the bug is scheduling, not volume. Once requests are concurrent, each collision costs one increment, and how many goroutines happen to sit inside their load-store window at the same instant is decided by runtime scheduling and preemption — so the shortfall recurs constantly (the window is tiny, but the load is a single shared cache line), and its exact size differs run to run. Even on a single core, Go's async preemption can suspend a goroutine between the load and the store, so overlap does not strictly need parallelism. Formally the code is a data race: two goroutines read and write \`counter\` with no happens-before edge, which is exactly what \`-race\` names.`,
  fix: `- **The atomic:** \`var counter atomic.Int64\` (or \`atomic.AddInt64(&counter, 1)\`) restores the "one operation" fiction at the hardware level. On x86-64 it compiles to one \`LOCK XADDQ\`: the bus hardware serializes the read-modify-write against every other core, so load-store interleaving is impossible. Its cost is cache-line contention — every increment across all cores queues on the one cache line — which is the minimum any correct answer can pay, and negligible at human request rates. It is the cheapest correct fix.
- **The mutex:** \`sync.Mutex\`/RW around the increment is correct. Uncontended, its fast path is about as cheap as the atomic; contended (which 100K concurrent increments certainly are), goroutines park and wake through the runtime scheduler instead of simply retrying in hardware, so per-operation cost climbs with contention. Correct, and the standard choice when the section you lock is bigger than one word.
- **The channel:** an owner goroutine that holds \`counter\` and reads \`<-ch\` increments with each event is correct and idiomatic, but per increment it pays a channel handoff and, once the owner cannot keep up, a park/unpark — the most expensive of the three correct answers. Use it when the work around the counter is already message-shaped.
- **Things that feel right and are not.** More CPU (more cores widen the window, they never shrink it); a "compiler barrier" (barriers order memory ops, they do not make two points of access exclusive); moving the reads or writes around (reordering *within* one goroutine does not stop two goroutines from overlapping); or single-threading the handler to dodge the race (the load test keeps concurrency, and any one request re-introduces it).
- **Verify, don't assume:** run the same test with \`-race\` sop it names the line; re-run the code unchanged and watch the shortfall move (diagnostic), then the fixed code land exactly on 100,000. Because the fix adds a happens-before edge, the value read anywhere after is also the synchronized one — the fix heals the read as well as the write.`,
  remember: [
    "A ++ in the source is a read-modify-write in the machine; two of them can overlap and one increment becomes the other's.",
    "Unsynchronized access is a data race even when every individual load and store is atomic — lost updates need no corruption to show up.",
    "Make the composite atomic, don't shrug at volume: a LOCK XADD on x86, a mutex or channel portably — and -race names the line for you.",
  ],
  rubric: [
    {
      text: "Named the read-modify-write (load, add, store) rather than asserting counter++ is a single machine instruction",
      dim: "correctness",
    },
    {
      text: "Explained the lost update by a concrete interleaving of two goroutines between the load and the store",
      dim: "correctness",
    },
    {
      text: "Distinguished this from a torn write, using the never-above-true, clean-value evidence",
      dim: "process",
    },
    {
      text: "Accounted for the run-to-run variance via scheduler overlap rather than volume or dropped connections",
      dim: "depth",
    },
    {
      text: "Picked a correct fix and stated its cost (hardware lock + cache-line contention for the atomic; park/wake for the contended mutex)",
      dim: "depth",
    },
    {
      text: "Rejected the plausible wrong fixes (bigger machine, barriers, single-threaded handlers)",
      dim: "depth",
    },
  ],
} satisfies Incident;
import type { Incident } from "./types";

export const cacheChurnScatterQueryCascade = {
  slug: "cache-churn-scatter-query-cascade",
  title:
    "Cache hit rate fell to 34% and stayed there. Stopping the rollout 18 minutes in changed nothing.",
  publishedAt: "2026-10-03",
  difficulty: "hard",
  topic: "caching",
  tags: [
    "caching",
    "cascading-failure",
    "sharding",
    "control-plane",
    "load-shedding",
  ],
  symptom:
    "You run a team chat product. Every session's first call is client boot: the client asks who it is and which conversations it belongs to, and nothing works until that call returns. Boot reads group-chat membership — who is in which group DM — and that data is immutable once written and cached per channel with a long TTL, so boot is normally a handful of cache reads and finishes in single-digit milliseconds. You are rolling out a new version of the host agent across the fleet in 25% steps; two earlier steps that week went without incident. Just after 06:00 Pacific, tickets arrive, internal users cannot get in, and several teams are paged. Boot is failing outright or taking tens of seconds. One database keyspace is severely overloaded, and the query filling it is the one that lists group DMs. You pause the rollout. Twenty minutes later the metrics have not moved.",
  constraints: [
    "The cache tier sits behind a proxy that maps each key to a node by consistent hashing over the ordered list of currently healthy nodes — change the list and keys remap",
    "200 cache nodes in the ring. The paused step was taking 50 of them out, sequentially, and the proxy's healthy-host list changes with every one",
    "A provisioning controller watches the service catalog: when a cache node leaves the catalog it promotes an empty spare, and a node that rejoins is flushed before it is promoted. It is designed to keep the ring stable and to flush only when it must",
    "Group-DM membership is immutable and cached by channel ID with a long TTL, so it is almost always served from cache — 99.2% hit rate in the week before the rollout",
    "Membership rows live in the table sharded by user, across 200 shards. No shard owns a given channel, so answering 'who is in channel C' means querying every shard — a scatter query, one execution, 200 shard reads",
    "A table sharded by channel already exists. It holds channel metadata only — name, purpose, created_at — and none of the member rows this query needs",
    "Client calls time out at 400ms. The cache's fill path uses the same query over the same connection, so a fill fails whenever the read would",
    "Clients retry three times with exponential backoff and full jitter",
    "The only mitigation available at the time was throttling client boot, which holds unbooted clients at the door",
  ],
  evidence: [
    "Membership cache hit rate falls from 99.2% to 34% across the step and then stays at 34% for the following 40 minutes — the controller log shows the last node replacement at minute 34, and the hit rate does not move after it",
    "Every entry in the controller log during the step is the same two events: a cold spare promoted to replace a departed node, and a rejoining node flushed before promotion. 50 hosts left the catalog and 50 empty spares were promoted over 22 minutes",
    "The hot query against the user-sharded table takes a single channel ID as its only parameter, and its shard count is 200 — no execution can be answered by one shard. Measured against the boot rate, database query count tracks boot rate × miss fraction × 200, not boot rate",
    "Median latency for that query sits at the 400ms client timeout for the whole incident, and the hit rate is flat rather than recovering: the fill path is timing out at the same rate the read path is",
    "Raising the boot cap from 250/min to 2,500/min put query fan-out back to its pre-throttle level within 90 seconds. The cap had to be cut back to 250 and then raised in roughly 10% steps, holding at each step until fan-out stopped climbing",
    "Replica lag on the user-sharded table is 200ms at p99, membership rows are never updated after insert, and 100% of the 200-way fan-out went to primaries",
  ],
  question:
    "Why did stopping the rollout not restore service, why did database load grow faster than the miss rate did, and what has to change — to recover now, and to stop it happening again?",
  picks: [
    {
      id: "why-pause-failed",
      prompt: "The rollout was paused 18 minutes in and nothing improved. Why?",
      options: [
        {
          id: "state-not-trigger",
          label:
            "The system crossed a saturation point and now sustains itself: misses overload the database, the overload times out the fills, the cache cannot refill, so the misses continue. The pause removed a trigger, but the state it left behind is generating its own load",
        },
        {
          id: "controller-never-stopped",
          label:
            "The provisioning controller kept flushing and replacing healthy nodes after the pause, so the cache never got a chance to settle",
        },
        {
          id: "retries-ignore-backoff",
          label:
            "Clients retried without backoff, so they kept generating the same load regardless of what happened to the fleet",
        },
        {
          id: "draining-restarts",
          label:
            "The remaining node restarts were still draining, and the system needed the rest of the step to finish before it could recover",
        },
      ],
      answer: "state-not-trigger",
    },
    {
      id: "why-superlinear",
      prompt: "Why did database load grow so much faster than the cache miss rate?",
      options: [
        {
          id: "fanout-per-miss",
          label:
            "One missing channel costs a scatter query — 200 shard reads — so cost per boot is misses × 200. Once the miss rate is high, nearly every boot pays several full fan-outs, which is a step change rather than a percentage change",
        },
        {
          id: "slower-per-miss",
          label:
            "Each individual query gets slower as the cache goes cold, because the cache tier is also cold and slow at the same time",
        },
        {
          id: "partition-locks",
          label:
            "A scatter query holds each shard's partition while it waits for the slowest shard to answer, so concurrent misses serialize behind each other",
        },
        {
          id: "misses-evict",
          label:
            "Every miss evicts a healthy key on its way in, so the miss rate compounds within a single boot rather than staying at the measured rate",
        },
      ],
      answer: "fanout-per-miss",
    },
    {
      id: "throttle-shape",
      prompt: "How should the boot throttle be used?",
      options: [
        {
          id: "boot-path-incremental",
          label:
            "Throttle the boot path only, so sessions that already booted keep working untouched, and raise the cap in small steps — each step small enough that it cannot re-saturate what the last step relieved",
        },
        {
          id: "uniform-then-restore",
          label:
            "Throttle all traffic evenly so no path is privileged, then restore everything to full capacity in one step once the database is healthy again",
        },
        {
          id: "scale-db-first",
          label:
            "Scale the database tier out first, then lift the throttle, since more capacity under the miss load means boot can be unthrottled sooner",
        },
        {
          id: "kill-retries",
          label:
            "Disable client retries outright and lift the throttle, since retry traffic is pure amplification with no useful work in it",
        },
      ],
      answer: "boot-path-incremental",
    },
    {
      id: "remove-amplification",
      prompt: "Which change removes the amplification rather than absorbing it?",
      options: [
        {
          id: "denormalize-to-channel",
          label:
            "Put the member rows in the table sharded by channel, so one missing channel costs one shard instead of 200, and serve those reads from replicas as well as primaries",
        },
        {
          id: "more-shards",
          label:
            "Add shards to the user-sharded table, so the fan-out has more targets to spread across and each one is smaller",
        },
        {
          id: "longer-ttl",
          label:
            "Raise the cache TTL, since membership is immutable and a longer TTL means fewer misses to pay the fan-out for",
        },
        {
          id: "longer-backoff",
          label:
            "Lengthen the client backoff, so fewer boots are in flight while the cache is cold and each one is retried later",
        },
      ],
      answer: "denormalize-to-channel",
    },
    {
      id: "control-loop",
      prompt: "What does the provisioning controller's behaviour say about control loops like it?",
      options: [
        {
          id: "bound-the-rate",
          label:
            "The loop was doing the right thing with no rate limit: acting as fast as it could turned a rolling change into sustained cold-cache churn, so its pace has to be bounded and tied to hit rate, not made faster",
        },
        {
          id: "revert-the-loop",
          label:
            "The controller is buggy — promoting empty spares and flushing rejoins is simply wrong and should be reverted to its previous behaviour",
        },
        {
          id: "faster-is-safer",
          label:
            "Faster failure detection is always safer, so the loop should react even more quickly and the fix belongs in making the reaction cheap",
        },
        {
          id: "fix-downstream-only",
          label:
            "The controller behaved exactly as designed and all the damage was downstream, so the fix belongs entirely in the database layer",
        },
      ],
      answer: "bound-the-rate",
    },
  ],
  diagnosis: `**What the rollout did to the cache.** The cache tier is only a cache because a proxy maps keys onto nodes by consistent hashing over the ordered list of healthy nodes. That list is the fragile part. When a node leaves the catalog, its share of the keyspace has to go somewhere, and the controller's answer is to promote an empty spare — a node with nothing in it, whose share of the ring is entirely misses. The next part is the one that turns a rolling upgrade into an outage: a node that comes back is flushed before it is promoted, deliberately, on the theory that a rejoining node may hold data that is no longer valid. For a cache holding only immutable membership that theory is wrong, and the flush throws away a warm node that had just finished refilling. Fifty nodes out, fifty empty spares in, fifty warm nodes flushed on the way back. Every step of that is individually correct behaviour from three systems doing exactly what they were built to do.

Hit rate does not recover afterwards, and that is the whole incident in one line. The last replacement is at minute 34. From minute 34 to minute 74 the ring is stable, the controller has nothing left to do, and the hit rate sits at 34% — not climbing, not decaying. A number that stops moving when its cause stops moving is a state, not a trigger.

*Key insight: a rolling change turns into an outage when the control plane reacting to it is faster than the thing it is managing can refill. The rollout was the trigger; the churn was the amplifier; the cold ring was the state.*

**Why the miss path is not one query.** Membership rows live in the table sharded by user. A row belongs to a user, so the user is the routing key and the channel is just a column — and that means no shard owns any particular channel. Asking "who is in channel C" cannot be routed, so the database runs it as a scatter: 200 shard reads, fanned out, merged, one result. At a 99.2% hit rate this never happens; boot reads about 12 group DMs and misses on roughly one in a hundred of them, so a boot pays essentially zero fan-out and the keyspace is idle.

Now the miss rate goes to 66%. A boot needs about 12 channels, so it misses on roughly 8 of them, and each miss is a separate 200-way scatter — about 1,600 shard reads for one boot. The relationship between miss rate and load is linear, with a coefficient of 200 per missing channel, and that coefficient is the entire story. It is not that a colder cache is a slower cache; it is that a colder cache multiplies the most expensive query in the system by the number of channels a single client happens to need. And it is close to a step rather than a slope: at 1% misses, essentially every boot pays nothing; at 66%, essentially every boot pays the full fan-out several times over.

Worth being precise about the shape, because the dashboards said "superlinear" and the mechanism is slightly more interesting than that. The term is linear in misses. What makes it look superlinear is downstream: the shard tier has a saturation knee, and past it the fan-out stops completing inside the 400ms budget, so each boot's misses turn into timeouts, and timeouts turn into three client retries with backoff and jitter — which is a multiplier on top of an already multiplied quantity. The retry path is what turns a heavy load into an avalanche.

*Key insight: cost per read is not one query, it is misses × fan-out. A cache that is 99% effective and one that is 34% effective are not 65 points apart — they are two orders of magnitude apart.*

**Why the pause did nothing, and why nothing would have.** The saturation closes a loop. Misses produce fan-out; fan-out saturates the shard tier; saturation pushes queries past 400ms; the cache's fill path uses the same query, the same shards and the same timeout, so fills fail at exactly the rate reads do; the cache does not refill; the miss rate stays where it is, which keeps producing fan-out. Each link is individually unremarkable. Together they are a stable fixed point with a positive gain, and a system sitting on one of those does not need an external cause to stay broken — it needs a change to *its own state*.

This is what pausing a rollout actually does. It stops new inputs. It does not move the state the inputs produced, and it does nothing at all about the loop now generating its own load. Nobody suspected the rollout for hours — and the honest reading of the incident is that they were right not to. Had the rollout never started, the same cache, with the same control loop, would have eventually churned from something else: a node failure, a deploy, a rebalance. The rollout was the thing that happened to be adjacent.

*Key insight: after saturation, the trigger is history. The question that matters is not "what caused this" but "what state did the cause leave behind, and what is keeping that state true".*

**Why the mitigations had to be shaped the way they were.** Throttling boot was the only lever, and it worked because it attacks the only term anyone could actually turn down: the fan-out is generated per boot, so boots per minute is the multiplier on it. The first attempt to raise the cap from 250/min to 2,500/min put fan-out straight back to its pre-throttle level inside 90 seconds — a 10x step in a system whose saturation point had not moved at all is just a way of re-running the incident. Cutting back and raising in roughly 10% steps, holding at each one until fan-out stopped climbing, is the difference between controlling a saturated system and restarting the outage.

Two things the throttle deliberately does *not* do. It does not touch already-booted sessions — those cost nothing, they are cache hits again, and throttling them would convert a boot-path problem into a total outage with no upside. And it does not replace the structural fix, because it only bounds the multiplier; a boot still costs 1,600 shard reads while it lasts.

*Key insight: throttle the path that generates work, not the traffic that is merely passing through — and never take a throttle step larger than the relief you just bought.*

**What actually removes the amplification.** Three changes, in the order they mattered.

The first is to stop asking the database a question it cannot answer cheaply. Put the member rows in the table sharded by channel — denormalize membership onto the key that is actually being looked up. The existing channel-keyed table has the metadata and none of the rows, so this is real work: backfill, dual-write, and a consistency window where both copies exist. But it converts a miss from 200 shard reads into 1, which is the difference between an outage and an inconvenience.

The second is to stop sending immutable reads to primaries. Membership rows are written once and never updated, replica lag is 200ms at p99, and a client that boots 200ms behind is not harmed — so all 200-way fan-out was pure primary load for data that never changes. Serving it from replicas takes the entire amplification off the write path.

The third is the one that stops the recurrence. The rollout process needs a gate that is not the agent version: hold each step while cache hit rate is below its pre-step value, and cap how many cache nodes may leave the catalog per minute, whatever else is true. And the control loop itself needs a rate bound and a policy for when flushing is actually necessary — because a loop that replaces a node with an empty spare the instant the node leaves is optimising for availability of *a node* when what the system needs is availability of *data*, and those two come apart exactly when things are already going badly.

*Key insight: a control loop with no rate limit is still unbounded. The right question about an automated response is not "is it correct?" but "how fast can it act relative to how fast the thing it manages can recover?"*

**What is inference rather than record.** Two parts of the above are reasoned extensions of what the postmortem actually established. The claim that adding shards would have made each scatter worse — because the cost is a function of shard count, so splitting the user-sharded table further makes every miss more expensive — follows from the fan-out arithmetic and was not tested during the incident. And the shape of the control-loop fix — bound the replacement rate, gate it on hit rate, stop flushing nodes whose contents are still valid — is a direction the postmortem committed to, not a mechanism anyone verified. Treat both as the argument they are, not as observation.`,
  fix: `- **Throttle the boot path only, and step the cap up.** Already-booted sessions are cache hits again and cost nothing; throttling them buys nothing and turns a partial outage into a total one. Start far enough below saturation that fan-out falls measurably, then raise in roughly 10% steps and hold each step until fan-out flattens. Watch queries-per-second at the shard tier, not boots per minute — boots is the input you are moving, fan-out is what you are actually trying to hold down. A step that re-saturates costs more than the step before it, because the fills that timed out during it have to be redone.
- **Ask the database a question it can route.** Denormalize membership onto the channel key: add member rows to the channel-sharded table, backfill from the user-sharded table, dual-write during the cutover, and keep the read path on one source until the copies are verified. This is the change that turns a miss from 200 shard reads into 1, and it is the one that makes the next cache cold event boring.
- **Serve immutable data from replicas.** Membership rows are insert-once and never updated, replica lag is 200ms at p99, and nothing in the boot path needs read-your-writes — so these reads belong on replicas. Do it for the fan-out query first; it is the load that matters when the tier is under pressure.
- **Fetch only what is missing.** The miss path should read the cache for the exact channel IDs the client needs and query only the ones that came back empty. It should never fetch a user's whole DM list to answer for twelve of them — eleven of those answers were already cached, and the query paid for all of them anyway.
- **Bound the control loop.** Cap cache-node replacements per minute independently of how fast the catalog changes. Prefer promoting a warm spare over an empty one. Flush a rejoining node only when the data it holds could actually be stale, which for an immutable, TTL-keyed keyspace is almost never. And make the loop's rate a function of current hit rate: when the cache is already cold, replacing nodes makes it colder, so the loop should slow down rather than speed up.
- **Gate the rollout on the thing that broke, not the thing being upgraded.** Hold each step while membership cache hit rate is below its pre-step baseline, and make the step size smaller than the ring can absorb — a step that takes 25% of the nodes out is a step that empties 25% of the keyspace, and no amount of correct control-plane behaviour makes that cheap.
- **Client retries last, and only as much as needed.** Backoff with jitter was already correct and was not the root cause; lengthening it slows recovery as well as the load, since a longer backoff means longer before a client that could have succeeded tries again.`,
  remember: [
    "The trigger and the state are different things, and after saturation only the state matters. Stopping the rollout stops new inputs to a loop that is generating its own — the question to ask is what state the cause left behind, not what caused it.",
    "A fan-out miss is not a miss. Cost per read is misses × shard count, so a cache at 99% hit rate and one at 34% are not 65 points apart, they are two orders of magnitude apart. Ask what one miss costs before you ask how often it happens.",
    "Timeouts are load. When the cache's fill path shares the query, the shards and the deadline with the read path, saturation stops the refill — and a cache cannot recover from the event that emptied it.",
    "Throttle the path that generates work, not the traffic passing through it, and take steps smaller than the relief you just bought: a 10x raise in a cap whose saturation point has not moved is just the outage again, faster.",
    "A control loop that acts faster than its subject can recover is an amplifier wearing the costume of a fix. Bound the rate, prefer a warm spare to an empty one, and make the loop's speed a function of the state it is trying to protect.",
  ],
  rubric: [
    {
      text: "Separated the trigger from the state: named the rollout as adjacent rather than causal, on the grounds that the same loop would have been reached by a node failure or a deploy",
      dim: "process",
    },
    {
      text: "Used the flat hit rate after the last replacement — 40 minutes of no change — to rule out 'restarts still draining' rather than assuming the pause worked",
      dim: "process",
    },
    {
      text: "Identified the closed loop: misses saturate the shards, saturation times out the fills, the cache cannot refill, the misses persist",
      dim: "correctness",
    },
    {
      text: "Named the fan-out as the amplifier — one missing channel is 200 shard reads — rather than treating the cold cache itself as the fault",
      dim: "correctness",
    },
    {
      text: "Quantified the coefficient: about 8 missing channels per boot × 200 shards ≈ 1,600 shard reads per boot, versus effectively zero at a 99.2% hit rate",
      dim: "depth",
    },
    {
      text: "Explained why it read as superlinear when the term is linear — the saturation knee plus three retries with backoff and jitter multiplying an already multiplied quantity",
      dim: "depth",
    },
    {
      text: "Named denormalizing membership onto the channel key as the fix that removes the amplification, and noticed that the existing channel-keyed table holds no member rows, so it is a real migration rather than a query rewrite",
      dim: "depth",
    },
    {
      text: "Justified reading from replicas on immutability and a 200ms lag budget, and saw it as taking the whole fan-out off the primaries rather than as a nice-to-have",
      dim: "depth",
    },
    {
      text: "Recommended bounding the control loop rather than reverting or speeding it up: rate-limit replacements, prefer warm spares, flush only when staleness is possible, and slow the loop down when hit rate is already low",
      dim: "correctness",
    },
    {
      text: "Shaped the throttle around the boot path and incremental raises, and explained the failed 250 → 2,500 step as re-running the incident rather than as an unlucky guess",
      dim: "process",
    },
    {
      text: "Flagged which conclusions were inference — the shard-count tradeoff and the shape of the control-loop fix — rather than presenting them as observed",
      dim: "depth",
    },
  ],
} satisfies Incident;
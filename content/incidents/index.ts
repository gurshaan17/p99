import { cacheStampedeSynchronizedTtl } from "./007-cache-stampede-synchronized-ttl";
import { noisyNeighborPoolStarvation } from "./008-noisy-neighbor-pool-starvation";
import { gcPauseP99Spikes } from "./009-gc-pause-p99-spikes";
import { livenessProbeCascadingRestarts } from "./010-liveness-probe-cascading-restarts";
import { autovacuumStarvationLongTransaction } from "./011-autovacuum-starvation-long-transaction";
import { idempotencyKeyDoubleCharge } from "./012-idempotency-key-double-charge";
import { seqScanBeatsIndexWhale } from "./013-seq-scan-beats-index-whale";
import { cpuPeggedDbIdle } from "./014-cpu-pegged-db-idle";
import { hotKeySingleThreadRedis } from "./015-hot-key-single-thread-redis";
import type { Incident } from "./types";

export type { Incident };
export { TOPICS, type Topic } from "./types";

/**
 * Every incident, newest first.
 *
 * Numbering continues from the six that lived in `lib/questions.ts` before the
 * schema moved to `content/incidents/`. Sorted by `publishedAt` rather than by
 * filename, so a new file's number does not have to match its publish order.
 *
 * No content lives here — each incident is one file, one export.
 */
export const incidents: Incident[] = [
  cacheStampedeSynchronizedTtl,
  noisyNeighborPoolStarvation,
  gcPauseP99Spikes,
  livenessProbeCascadingRestarts,
  autovacuumStarvationLongTransaction,
  idempotencyKeyDoubleCharge,
  seqScanBeatsIndexWhale,
  cpuPeggedDbIdle,
  hotKeySingleThreadRedis,
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

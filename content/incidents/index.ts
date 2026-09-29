import { cacheStampedeSynchronizedTtl } from "./007-cache-stampede-synchronized-ttl";
import { noisyNeighborPoolStarvation } from "./008-noisy-neighbor-pool-starvation";
import { gcPauseP99Spikes } from "./009-gc-pause-p99-spikes";
import { livenessProbeCascadingRestarts } from "./010-liveness-probe-cascading-restarts";
import { autovacuumStarvationLongTransaction } from "./011-autovacuum-starvation-long-transaction";
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
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

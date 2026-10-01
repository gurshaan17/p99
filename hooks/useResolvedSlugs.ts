"use client";

import { useSyncExternalStore } from "react";
import { ATTEMPT_EVENT, isResolved, readCompletedAttempts } from "@/lib/attempts";

/**
 * Which incidents this reader has read through — DESIGN.md section 8.4.
 *
 * One subscription for the whole archive, not one per row. `ArchiveView` is
 * already the client owner of the filter and view state, and the rows are shared
 * with `/` and `/topics`; making each row its own subscriber would mean N reads of
 * every attempt record on every write, and would spread one piece of state across
 * four files. So the set is computed once here and passed down as a boolean.
 *
 * The same external-store shape as `useAttempt` and `StreakRecord`, for the same
 * reason: localStorage is the store, and a returning reader's marks arrive in the
 * first client render rather than in an effect that corrects the server's paint.
 *
 * The snapshot is a `Set`, so it has to be referentially stable or React loops.
 * The cache keys on the sorted slug list, and `readCompletedAttempts` walks only
 * the slugs in the index rather than every key on the origin.
 */

const EMPTY: ReadonlySet<string> = new Set();
let cache: { version: string; value: ReadonlySet<string> } | null = null;

function getSnapshot(): ReadonlySet<string> {
  const slugs = [...readCompletedAttempts()]
    .filter(([, attempt]) => isResolved(attempt))
    .map(([slug]) => slug);

  const version = JSON.stringify([...slugs].sort());
  if (cache && cache.version === version) return cache.value;

  const value = new Set(slugs);
  cache = { version, value };
  return value;
}

/**
 * The server has no localStorage, so every row starts unmarked. A reader who has
 * already finished an incident gets the mark on hydration — a badge appearing
 * where a row used to be is not a layout shift worth pretending to avoid, and
 * marking rows on the server would mean rendering the archive per-reader.
 */
function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

/** Same-tab writes do not fire `storage`, so the attempt actions dispatch this. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ATTEMPT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ATTEMPT_EVENT, onChange);
  };
}

export function useResolvedSlugs(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

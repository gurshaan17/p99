"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  ATTEMPT_EVENT,
  emptyAttempt,
  parseAttempt,
  attemptKey,
  lockIn,
  setFreeText,
  setPickAnswer,
  setRubricCheck,
  submitSelfCheck,
  type Attempt,
} from "@/lib/attempts";

/**
 * Attempt state — DESIGN.md section 8.2.
 *
 * Same external-store shape as `components/archive/view-toggle.tsx`: localStorage
 * is the store, and reads go through `useSyncExternalStore` so the first client
 * render already agrees with the server instead of correcting itself in an
 * effect. `getServerSnapshot` never touches localStorage — it hands back a
 * cached empty attempt, so a returning reader's first paint is the blank form
 * and their real answers arrive immediately after hydration rather than as a
 * mismatch warning.
 *
 * One thing this must get right, which the string-valued view preference does
 * not have to: `getSnapshot` has to return a *referentially stable* object.
 * Returning a freshly parsed attempt every call makes React re-render forever
 * ("the result of getSnapshot should be cached"), so parsed attempts are memoised
 * against the exact raw string they came from. Same string, same object, no
 * re-render; new bytes, one re-render.
 *
 * The four components on the incident page each call this independently instead
 * of lifting one copy of the state. That is the point of keeping the store
 * outside React: a pick answer written in the form re-renders the reveal, the
 * checklist, and the score without any of them knowing about the others.
 */

const cache = new Map<string, { raw: string | null; value: Attempt }>();
const serverSnapshots = new Map<string, Attempt>();

function readRaw(slug: string): string | null {
  try {
    return window.localStorage.getItem(attemptKey(slug));
  } catch {
    return null;
  }
}

function getSnapshot(slug: string): Attempt {
  const raw = readRaw(slug);
  const hit = cache.get(slug);
  if (hit && hit.raw === raw) return hit.value;

  const value = parseAttempt(slug, raw);
  cache.set(slug, { raw, value });
  return value;
}

/** Stable per slug: a fresh object here would loop the server render too. */
function getServerSnapshot(slug: string): Attempt {
  let value = serverSnapshots.get(slug);
  if (!value) {
    value = emptyAttempt(slug);
    serverSnapshots.set(slug, value);
  }
  return value;
}

/** Same-tab writes do not fire `storage`, so the actions dispatch this too. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ATTEMPT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ATTEMPT_EVENT, onChange);
  };
}

export function useAttempt(slug: string): Attempt {
  const get = useCallback(() => getSnapshot(slug), [slug]);
  const getServer = useCallback(() => getServerSnapshot(slug), [slug]);
  return useSyncExternalStore(subscribe, get, getServer);
}

export {
  lockIn,
  setFreeText,
  setPickAnswer,
  setRubricCheck,
  submitSelfCheck,
};
export type { Attempt };

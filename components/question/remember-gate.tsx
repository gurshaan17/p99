"use client";

import type { Incident } from "@/lib/incidents";
import { useAttempt } from "@/hooks/useAttempt";
import { isLocked } from "@/lib/attempts";
import { Remember } from "./incident";

/**
 * The three things to remember, behind the lock-in — DESIGN.md sections 8.2, 15a.
 *
 * `Remember` itself is ungated, because the home page's `Reveal` already puts it
 * behind its button and does not need a second gate. On the article it does, and
 * that is this component's whole reason to exist.
 *
 * These read as the compressed lesson, which made ungated them look harmless. They
 * are not. "A cache that is 98% effective can still be the whole outage" *is* the
 * diagnosis for the cache-stampede incident — it is the answer, written as a
 * generality, and a reader who never commits would have had it for free. The site
 * exists to withhold the answer until the reader risks one, and a summary of the
 * answer in the last three bullets undoes that for anyone willing to scroll.
 *
 * Same payload, same reason as `DiagnosisReveal`: this is pacing, not secrecy.
 */
export function RememberGate({ incident }: { incident: Incident }) {
  const attempt = useAttempt(incident.slug);

  if (!isLocked(attempt)) return null;

  return <Remember items={incident.remember} />;
}

"use client";

import type { Incident } from "@/lib/incidents";
import { useAttempt } from "@/hooks/useAttempt";
import { isLocked } from "@/lib/attempts";
import { Diagnosis, Fix } from "./incident";

/**
 * Solution reveal — DESIGN.md sections 8.2, 10.
 *
 * Renders nothing at all until the reader has locked in. The diagnosis is already
 * in the page payload either way, so this is pacing rather than a gate, and
 * withholding it visually is the whole mechanism: there is no collapsed region to
 * inspect and no request to answer before the answer appears.
 *
 * The transition is the existing `.reveal` — an 8px rise and fade over
 * `--dur-ui`, the one content-reveal motion section 10 defines, already guarded
 * by the `prefers-reduced-motion` block in `globals.css` that drops the
 * translate and keeps the fade. No new motion token, and no new keyframe.
 */
export function DiagnosisReveal({ incident }: { incident: Incident }) {
  const attempt = useAttempt(incident.slug);

  if (!isLocked(attempt)) return null;

  return (
    <div className="reveal flex flex-col gap-section">
      <Diagnosis text={incident.diagnosis} index="05" />
      <Fix text={incident.fix} index="06" />
    </div>
  );
}

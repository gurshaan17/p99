"use client";

import type { Incident } from "@/lib/incidents";
import { useAttempt, setFreeText, setPickAnswer, lockIn } from "@/hooks/useAttempt";
import { FREE_TEXT_MAX, isLocked } from "@/lib/attempts";
import { PrimaryButton } from "@/components/ui/button";
import { Section } from "./incident";
import { PickQuestion } from "./pick-question";

/**
 * Prediction form — DESIGN.md section 8.2.
 *
 * Commit to a diagnosis before the fix is shown. Locking in is the only thing
 * that reveals anything, and it is irreversible: the picks and the explanation
 * become read-only the moment it is set, because a self-score is only worth
 * anything if the answer it scores was written first.
 *
 * Every keystroke and every selection is written as it happens, not on submit.
 * A reader who gets interrupted mid-thought comes back to their own words rather
 * than an empty form — the commitment is the lock-in, not the typing.
 *
 * The free text is optional. Some readers want the two-click version, and
 * forcing prose to unlock the page would be a writing test dressed up as a
 * diagnostic one. Only having picked nothing blocks the button.
 */
export function PredictionForm({ incident }: { incident: Incident }) {
  const attempt = useAttempt(incident.slug);
  const locked = isLocked(attempt);

  const answered = incident.picks.filter(
    (pick) => attempt.pickAnswers[pick.id] !== undefined,
  ).length;

  // An incident with no picks has nothing to answer, so there is nothing to
  // block on; the free text is optional either way.
  const canLock = incident.picks.length === 0 || answered > 0;

  return (
    <Section index="04" label="Your prediction">
      <div className="flex flex-col gap-block">
        {incident.picks.map((pick, i) => (
          <PickQuestion
            key={pick.id}
            pick={pick}
            index={i + 1}
            value={attempt.pickAnswers[pick.id]}
            locked={locked}
            onChange={(optionId) => setPickAnswer(incident.slug, pick.id, optionId)}
          />
        ))}

        <div className="flex flex-col gap-item">
          <label
            htmlFor={`free-text-${incident.slug}`}
            className="font-mono text-micro tracking-wider text-ink-3 uppercase"
          >
            Why
          </label>
          <textarea
            id={`free-text-${incident.slug}`}
            value={attempt.freeText}
            onChange={(event) => setFreeText(incident.slug, event.target.value)}
            readOnly={locked}
            rows={4}
            maxLength={FREE_TEXT_MAX}
            placeholder="What is actually failing, and what would you check first?"
            className="w-full resize-y rounded-control border border-line bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-3 read-only:cursor-default read-only:border-line-strong"
          />
          <div className="flex items-center justify-between gap-item">
            <span
              aria-live="polite"
              className="font-mono text-micro tabular-nums text-ink-3"
            >
              {attempt.freeText.length} / {FREE_TEXT_MAX} chars
            </span>
          </div>
        </div>

        {locked ? (
          <p className="text-body text-ink-2 text-pretty">
            Locked in. Your answer is read-only now — the reasoning is worth more
            than a second guess.
          </p>
        ) : (
          <div>
            <PrimaryButton
              disabled={!canLock}
              onClick={() => lockIn(incident.slug)}
            >
              Lock in &amp; reveal solution
            </PrimaryButton>
          </div>
        )}
      </div>
    </Section>
  );
}

"use client";

import type { Incident, RubricDim } from "@/lib/incidents";
import { useAttempt } from "@/hooks/useAttempt";
import { isSubmitted } from "@/lib/attempts";

/**
 * Score — DESIGN.md section 8.2.
 *
 * Two numbers, deliberately not merged into one.
 *
 * The picks are auto-graded: the answer key is in the payload, so the reader
 * cannot argue with them. The rubric is self-reported and is scored exactly as
 * ticked, because the reader is the only one who can tell whether their
 * explanation reached the mechanism. Averaging the two into a single number would
 * lend the self-reported half a certainty it has not earned.
 *
 * The rubric score is a raw count rather than a percentage on purpose. A
 * percentage invites "67% — so I was mostly right?", and the honest answer is
 * that this is a list of things a complete answer contains, not an exam with
 * partial credit. Section 8.3's "informational rather than gamified" applies to
 * this card too: no badge, no celebration, no rank.
 */
const DIMS: readonly RubricDim[] = ["process", "correctness", "depth"];

const DIM_LABEL: Record<RubricDim, string> = {
  process: "Process",
  correctness: "Correctness",
  depth: "Depth",
};

export function ScoreCard({ incident }: { incident: Incident }) {
  const attempt = useAttempt(incident.slug);

  if (!isSubmitted(attempt)) return null;

  const total = incident.rubric.length;
  const ticked = incident.rubric.filter(
    (item) => attempt.rubricChecks[item.text] === true,
  ).length;

  const perDim = DIMS.map((dim) => {
    const items = incident.rubric.filter((item) => item.dim === dim);
    return {
      dim,
      hit: items.filter((item) => attempt.rubricChecks[item.text] === true)
        .length,
      count: items.length,
    };
  }).filter((entry) => entry.count > 0);

  const answered = incident.picks.filter(
    (pick) => attempt.pickAnswers[pick.id] !== undefined,
  );
  const right = answered.filter(
    (pick) => attempt.pickAnswers[pick.id] === pick.answer,
  ).length;

  return (
    <div className="flex flex-col gap-block">
      {/* Auto-graded. */}
      {incident.picks.length > 0 ? (
        <div className="flex flex-col gap-item">
          <h3 className="font-mono text-micro tracking-wider text-ink-3 uppercase">
            Picks
          </h3>
          <p className="text-body text-ink text-pretty">
            {right} of {incident.picks.length} correct
            {answered.length < incident.picks.length
              ? ` · ${incident.picks.length - answered.length} left unanswered`
              : ""}
          </p>
          <ul className="flex flex-col">
            {incident.picks.map((pick) => {
              const chosen = attempt.pickAnswers[pick.id];
              const skipped = chosen === undefined;
              const ok = chosen === pick.answer;
              const answerLabel =
                pick.options.find((option) => option.id === pick.answer)?.label ??
                pick.answer;

              return (
                <li
                  key={pick.id}
                  className="border-b border-dashed border-line py-row last:border-0"
                >
                  <p className="text-body text-ink-2 text-pretty">
                    {/* Word first: the state must not rest on colour (section 13). */}
                    <span
                      className={
                        skipped ? "text-ink-3" : ok ? "text-success" : "text-ink"
                      }
                    >
                      {skipped ? "Skipped. " : ok ? "Correct. " : "Wrong. "}
                    </span>
                    {pick.prompt}
                    {skipped || ok ? null : (
                      <>
                        {" "}
                        The answer was “{answerLabel}”.
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Self-reported. */}
      {total > 0 ? (
        <div className="flex flex-col gap-item">
          <h3 className="font-mono text-micro tracking-wider text-ink-3 uppercase">
            Your self-score
          </h3>
          <p className="text-body text-ink text-pretty">
            {ticked} of {total} covered
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-small text-ink-2">
            {perDim.map((entry) => (
              <li key={entry.dim} className="flex items-baseline gap-item">
                <span className="w-28 shrink-0 text-ink-3">
                  {DIM_LABEL[entry.dim]}
                </span>
                <span className="tabular-nums">
                  {entry.hit}/{entry.count}
                </span>
                <Bar hit={entry.hit} count={entry.count} />
              </li>
            ))}
          </ul>
          <p className="text-small text-ink-3 text-pretty">
            You marked this yourself, so treat it as a reading of your own answer
            rather than a grade.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Count bar. Width is inline because it is a ratio of two runtime values, and it
 * is mirrored by the `n/m` text beside it — the bar is decoration on a number
 * that is already stated, never the only carrier of the value (section 13).
 */
function Bar({ hit, count }: { hit: number; count: number }) {
  return (
    <span
      aria-hidden
      className="mt-1 inline-block h-1 w-full max-w-32 rounded-hairline bg-line"
    >
      <span
        className="block h-1 rounded-hairline bg-accent-ink"
        style={{ width: `${count === 0 ? 0 : (hit / count) * 100}%` }}
      />
    </span>
  );
}

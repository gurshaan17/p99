"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { Incident, RubricDim } from "@/lib/incidents";
import { useAttempt, setRubricCheck, submitSelfCheck } from "@/hooks/useAttempt";
import { isLocked, isSubmitted } from "@/lib/attempts";
import { PrimaryButton } from "@/components/ui/button";
import { Section } from "./incident";

/**
 * Self-score checklist — DESIGN.md section 8.2.
 *
 * What the reader's own answer actually covered, ticked by the reader, across
 * the three dimensions the incidents are written to reward. Radix `Checkbox` for
 * real `checkbox` semantics and keyboard behaviour, unstyled into the same dashed
 * row language as the rubric list it replaces.
 *
 * Self-reported and labelled as such. The reader is the only one who can judge
 * whether their explanation reached the mechanism, and pretending otherwise
 * would be a fake score. The auto-gradable part — whether the picks were right —
 * is kept separate in `ScoreCard` precisely so the two are never confused.
 *
 * Rubric item text is the storage key. It is stable against reordering the
 * rubric, which an index would not be, and the schema has no per-item id.
 */
const DIM_LABEL: Record<RubricDim, string> = {
  process: "Process",
  correctness: "Correctness",
  depth: "Depth",
};

export function RubricSelfCheck({ incident }: { incident: Incident }) {
  const attempt = useAttempt(incident.slug);
  const submitted = isSubmitted(attempt);

  if (!isLocked(attempt) || incident.rubric.length === 0) return null;

  const ticked = incident.rubric.filter(
    (item) => attempt.rubricChecks[item.text] === true,
  ).length;

  return (
    <Section index="07" label="Self-score">
      <div className="flex flex-col gap-block">
        <p className="text-body text-ink-2 text-pretty">
          Tick what your answer actually covered. This part is your own read on
          your own reasoning, so it is worth less than it looks — the picks below
          are the part that is marked for you.
        </p>

        <ul className="flex flex-col">
          {incident.rubric.map((item, i) => {
            const checked = attempt.rubricChecks[item.text] === true;
            // DOM id is index-based because rubric text can contain spaces and
            // punctuation; the storage key is still the text itself.
            const id = `rubric-${incident.slug}-${i}`;

            return (
              <li
                key={item.text}
                className="border-b border-dashed border-line last:border-0"
              >
                {/*
                  The whole row is the hit area, not the 16px indicator: the
                  `<label>` is 46px tall at every width, which already clears the
                  40px minimum from section 12. Deliberately no
                  `data-touch-target` on the indicator — the global
                  `pointer: coarse` rule would stretch the box itself to 40px
                  square and break the 16px visual the rubric list is built on.
                */}
                <label
                  htmlFor={id}
                  className={`flex min-h-(--touch-target) cursor-pointer items-start gap-item py-row transition-colors duration-(--dur-hover) ease-(--ease-out) ${
                    submitted ? "cursor-default" : "hover:text-ink"
                  }`}
                >
          <Checkbox.Root
            id={id}
            checked={checked}
            disabled={submitted}
            onCheckedChange={(next) =>
              setRubricCheck(incident.slug, item.text, next === true)
            }
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-hairline border border-line-strong bg-surface text-page transition-colors duration-(--dur-hover) ease-(--ease-out) data-[state=checked]:border-accent-ink data-[state=checked]:bg-accent-ink disabled:cursor-default"
          >
                    <Checkbox.Indicator className="flex items-center justify-center">
                      <Check aria-hidden className="size-3" strokeWidth={2.5} />
                    </Checkbox.Indicator>
                  </Checkbox.Root>

                  <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-item">
                    <span className="w-24 shrink-0 font-mono text-micro tracking-wider text-ink-3 uppercase">
                      {DIM_LABEL[item.dim]}
                    </span>
                    <span className="text-body text-ink-2 text-pretty">
                      {item.text}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {submitted ? null : (
          <div className="flex items-center gap-item">
            <PrimaryButton onClick={() => submitSelfCheck(incident.slug)}>
              Submit self-check
            </PrimaryButton>
            <span className="font-mono text-micro tabular-nums text-ink-3">
              {ticked} / {incident.rubric.length} ticked
            </span>
          </div>
        )}
      </div>
    </Section>
  );
}

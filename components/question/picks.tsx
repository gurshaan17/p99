"use client";

import { useState } from "react";
import type { Incident } from "@/lib/incidents";
import { PrimaryButton } from "@/components/ui/button";

/**
 * Prediction form — DESIGN.md section 8.2.
 *
 * Commit to an answer before the diagnosis is revealed. The verdict shows which
 * option was right rather than marking the chosen one in place, so a wrong
 * guess does not leave the correct answer hidden behind a scrolled list.
 *
 * State is per-render and deliberately not persisted: the point is to make the
 * reader commit, not to keep a scoreboard.
 */
export function Picks({ picks }: { picks: Incident["picks"] }) {
  if (picks.length === 0) return null;

  return (
    <div className="flex flex-col gap-block">
      {picks.map((pick, i) => (
        <Pick key={pick.id} pick={pick} index={i + 1} />
      ))}
    </div>
  );
}

function Pick({
  pick,
  index,
}: {
  pick: Incident["picks"][number];
  index: number;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = choice === pick.answer;
  const answerLabel =
    pick.options.find((o) => o.id === pick.answer)?.label ?? pick.answer;

  return (
    <fieldset className="flex flex-col gap-item border-0 p-0">
      <legend className="mb-item flex items-baseline gap-item font-mono text-micro tracking-wider text-ink-3 uppercase">
        <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
        {pick.prompt}
      </legend>

      <div className="flex flex-col">
        {pick.options.map((option) => {
          const selected = choice === option.id;
          const isAnswer = option.id === pick.answer;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-item border-b border-dashed border-line py-row transition-colors duration-(--dur-hover) ease-(--ease-out) ${
                checked && isAnswer ? "text-ink" : ""
              } ${checked && selected && !isAnswer ? "text-ink-3 line-through" : ""} hover:text-ink`}
            >
              <input
                type="radio"
                name={pick.id}
                value={option.id}
                checked={selected}
                disabled={checked}
                onChange={() => setChoice(option.id)}
                className="mt-1 size-4 shrink-0 accent-accent-ink"
              />
              <span className="text-body text-pretty">{option.label}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-item">
        {checked ? (
          <p
            className={`text-body text-pretty ${
              correct ? "text-success" : "text-ink-2"
            }`}
          >
            {correct ? "Correct. " : "Not quite. "}
            {correct ? null : <>The answer is “{answerLabel}”. </>}
          </p>
        ) : (
          <PrimaryButton
            disabled={choice === null}
            onClick={() => setChecked(true)}
          >
            Check
          </PrimaryButton>
        )}
      </div>
    </fieldset>
  );
}

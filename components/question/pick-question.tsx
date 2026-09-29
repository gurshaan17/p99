"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import type { Incident } from "@/lib/incidents";

/**
 * One prediction pick — DESIGN.md section 8.2.
 *
 * Radix `RadioGroup` for the semantics section 13 asks for (`radiogroup` /
 * `radio`, arrow-key movement, one tab stop per group), unstyled: the row is the
 * same dashed list language as `constraints` and `evidence`, and the indicator
 * is a tokenized hairline ring rather than a UA control.
 *
 * Neutral before lock-in. The correct option is not marked, dimmed, or hinted at
 * until the reader has committed — a pick that visibly favours one answer is not
 * a prediction any more. After lock-in the chosen option is struck through and
 * the verdict is spelled out in words, so the state never rests on colour alone
 * (section 13).
 */
export function PickQuestion({
  pick,
  index,
  value,
  onChange,
  locked,
}: {
  pick: Incident["picks"][number];
  index: number;
  value: string | undefined;
  onChange: (optionId: string) => void;
  locked: boolean;
}) {
  const selected = value !== undefined;
  const correct = selected && value === pick.answer;
  const answerLabel =
    pick.options.find((option) => option.id === pick.answer)?.label ??
    pick.answer;

  return (
    <fieldset className="flex flex-col gap-item border-0 p-0">
      <legend className="mb-item flex items-baseline gap-item font-mono text-micro tracking-wider text-ink-3 uppercase">
        <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
        {pick.prompt}
      </legend>

      <RadioGroup.Root
        value={value ?? ""}
        onValueChange={onChange}
        disabled={locked}
        className="flex flex-col"
      >
        {pick.options.map((option) => {
          const isChosen = value === option.id;
          const isAnswer = option.id === pick.answer;

          return (
            <RadioGroup.Item
              key={option.id}
              value={option.id}
              className={`group flex w-full items-start gap-item border-b border-dashed border-line py-row text-left transition-colors duration-(--dur-hover) ease-(--ease-out) ${
                locked
                  ? isAnswer
                    ? "text-ink"
                    : isChosen
                      ? "text-ink-3 line-through"
                      : "text-ink-3"
                  : "text-ink-2 hover:text-ink"
              } disabled:cursor-default`}
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-line-strong transition-colors duration-(--dur-hover) ease-(--ease-out) group-data-[state=checked]:border-accent-ink"
              >
                <RadioGroup.Indicator className="size-2 rounded-full bg-accent-ink" />
              </span>
              <span className="text-body text-pretty">{option.label}</span>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>

      {locked && selected ? (
        <p
          className={`text-body text-pretty ${correct ? "text-success" : "text-ink-2"}`}
        >
          {correct ? "Correct." : "Not quite."}{" "}
          {correct ? null : <>The answer is “{answerLabel}”.</>}
        </p>
      ) : null}
    </fieldset>
  );
}

import type { Incident, RubricDim } from "@/lib/incidents";

/**
 * Rubric — DESIGN.md section 8.2.
 *
 * What a complete answer actually contains, split across the three dimensions
 * the incidents are written to reward: how you got there (process), whether the
 * mechanism is right (correctness), and whether you saw past the instance
 * (depth).
 *
 * Presented as a reading list rather than an interactive self-score. A self-score
 * with no stored history teaches nothing on the second visit, and a fake score
 * that resets every load is worse than no score.
 */
const DIM_LABEL: Record<RubricDim, string> = {
  process: "Process",
  correctness: "Correctness",
  depth: "Depth",
};

export function Rubric({ rubric }: { rubric: Incident["rubric"] }) {
  if (rubric.length === 0) return null;

  return (
    <ul className="flex flex-col">
      {rubric.map((item) => (
        <li
          key={item.text}
          className="flex flex-col gap-1 border-b border-dashed border-line py-row last:border-0 sm:flex-row sm:items-baseline sm:gap-item"
        >
          <span className="w-24 shrink-0 font-mono text-micro tracking-wider text-ink-3 uppercase">
            {DIM_LABEL[item.dim]}
          </span>
          <span className="text-body text-ink-2 text-pretty">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

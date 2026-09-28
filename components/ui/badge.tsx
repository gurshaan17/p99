import { DIFFICULTIES, type Difficulty, type Topic } from "@/lib/questions";

/**
 * Tags and badges — DESIGN.md section 7.11.
 *
 * Mono, uppercase, rounded-full, hairline border. Difficulty tints the text
 * only and never the fill, and always pairs the colour with the word itself so
 * the state is never carried by colour alone (section 13).
 */

const difficultyTone: Record<Difficulty, string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-danger",
};

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line px-2 py-0.5 font-mono text-micro uppercase tracking-wider ${difficultyTone[level]}`}
    >
      {level}
    </span>
  );
}

export function TopicBadge({ topic }: { topic: Topic }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 font-mono text-micro tracking-wider text-ink-3 uppercase">
      {topic}
    </span>
  );
}

/** Small rounded-square topic mark — section 11 (18px, rounded-chip container). */
export function TopicMark({ topic }: { topic: Topic }) {
  return (
    <span
      aria-hidden
      className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-chip bg-field font-mono text-[0.625rem] text-ink-3 uppercase"
    >
      {topic.slice(0, 2)}
    </span>
  );
}

export const difficultyOptions = DIFFICULTIES;

import { DIFFICULTIES, type Difficulty } from "@/lib/incidents";

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

export function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 font-mono text-micro tracking-wider text-ink-3 uppercase">
      {tag}
    </span>
  );
}

/** Small rounded-square mark for the archive row and grid card (section 11). */
export function TagMark({ tag }: { tag: string }) {
  return (
    <span
      aria-hidden
      className="flex size-mark shrink-0 items-center justify-center rounded-chip bg-field font-mono text-micro text-ink-3 uppercase"
    >
      {tag.slice(0, 2)}
    </span>
  );
}

export { DIFFICULTIES };

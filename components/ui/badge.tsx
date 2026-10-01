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

/**
 * The reader's own mark on an incident they finished — DESIGN.md section 8.4.
 *
 * Worded, not ticked. Section 13 forbids carrying a state by colour alone and
 * section 8.2 already requires verdicts to be spelled out, and a check glyph in a
 * row that also has to fit a difficulty badge, three tags and a date is a claim
 * the reader has to decode. `read · solved` is two words and costs one glance.
 *
 * Accent rather than neutral because section 1.5 reserves accent for the
 * reader's own state — nothing else on these rows is tinted, so it cannot be
 * confused with difficulty. Tinted surface, neutral hairline: `--accent-border`
 * is not in the Tailwind theme, and section 14 says promote a value rather than
 * invent it.
 *
 * The second word drops below `sm`, on the same precedent as the date in the
 * archive row: `read · solved` is ~104px as a pill, and next to the difficulty
 * badge and the topic mark it left the row's title about 117px to truncate into
 * at 375px. `read` alone still separates the row and costs ~60px less. Both words
 * stay in the accessibility tree in the same viewport-independent way the rest of
 * this file's states are — the mark never carries itself by colour or by width.
 */
export function SolvedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-accent-tint/40 px-2 py-0.5 font-mono text-micro uppercase tracking-wider text-accent-ink">
      read<span className="max-sm:hidden">&nbsp;&middot; solved</span>
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

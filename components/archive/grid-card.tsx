import Link from "next/link";
import type { Question } from "@/lib/questions";

/**
 * Grid card — DESIGN.md section 7.4.
 *
 * An alternate view, not the default language. Hover strengthens the border and
 * adds a subtle shadow; nothing moves (section 7.4, section 9).
 *
 * The preview panel stands in for the reference's generated abstract diagram
 * (section 7.4). It renders the question's own latency profile so the panel
 * carries information rather than decoration (section 11).
 */
export function GridCard({ question: q }: { question: Question }) {
  return (
    <Link
      href={`/q/${q.slug}`}
      className="group block rounded-card border border-line bg-page p-2 transition-[border-color,box-shadow] duration-(--dur-hover) ease-(--ease-out) hover:border-line-strong hover:shadow-card"
    >
      <div className="flex aspect-video items-end gap-1 overflow-hidden rounded-control bg-field p-3">
        {PROFILE[q.difficulty].map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className="flex-1 bg-ink-3/25 last:bg-accent-ink"
          />
        ))}
      </div>

      <div className="px-1 pt-3 pb-1">
        <div className="text-body font-medium text-ink">{q.title}</div>
        <p className="mt-1 line-clamp-2 text-small text-ink-3">
          {q.description}
        </p>
      </div>

      <div className="flex items-center justify-between px-1 pt-2 font-mono text-micro text-ink-3">
        <span className="uppercase tracking-wider">{q.topic}</span>
        <time dateTime={q.date} className="tabular-nums">
          {q.date}
        </time>
      </div>
    </Link>
  );
}

/** Latency profile silhouettes, one per difficulty. */
const PROFILE: Record<Question["difficulty"], number[]> = {
  easy: [40, 38, 42, 39, 44, 41, 46, 43, 70, 88],
  medium: [44, 40, 48, 42, 52, 45, 58, 50, 76, 94],
  hard: [50, 46, 55, 48, 62, 54, 70, 60, 84, 98],
};

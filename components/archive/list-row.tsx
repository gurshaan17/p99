import Link from "next/link";
import type { Question } from "@/lib/questions";
import { TopicMark, DifficultyBadge } from "@/components/ui/badge";

/**
 * Archive list row — DESIGN.md section 7.3.
 *
 * A catalogue row, not a card: no permanent border, no background box, tight
 * vertical padding, hover reveals an underline. Sibling-fade choreography and
 * the focus-restores-opacity rule live in the `.list-rows` rule in
 * `globals.css` rather than in these class names, because expressing
 * "fade the siblings of the hovered row" as utility classes is unreadable.
 */
export function ListRow({ question: q }: { question: Question }) {
  return (
    <li>
      <Link
        href={`/q/${q.slug}`}
        className="flex items-center gap-2.5 rounded-chip py-1.5 underline-offset-4 transition-[opacity,text-decoration-color] duration-(--dur-hover) ease-(--ease-out) hover:underline"
      >
        <TopicMark topic={q.topic} />

        <span className="truncate text-body font-medium text-ink">
          {q.title}
        </span>

        <span aria-hidden className="mx-1 shrink-0 text-ink-3">
          &middot;
        </span>

        <span className="min-w-0 flex-1 truncate text-body text-ink-3">
          {q.description}
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-2">
          <DifficultyBadge level={q.difficulty} />
          <time
            dateTime={q.date}
            className="hidden font-mono text-micro text-ink-3 tabular-nums sm:inline"
          >
            {q.date.slice(5).replace("-", "/")}
          </time>
        </span>
      </Link>
    </li>
  );
}

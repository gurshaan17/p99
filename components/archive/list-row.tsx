import Link from "next/link";
import { topicMeta, type Incident } from "@/lib/incidents";
import { TagMark, DifficultyBadge } from "@/components/ui/badge";

/**
 * Archive list row — DESIGN.md section 7.3.
 *
 * A catalogue row, not a card: no permanent border, no background box, tight
 * vertical padding, hover reveals an underline. Sibling-fade choreography and
 * the focus-restores-opacity rule live in the `.list-rows` rule in
 * `globals.css` rather than in these class names, because expressing
 * "fade the siblings of the hovered row" as utility classes is unreadable.
 *
 * The row mark is the incident's topic, not its first tag. The topic is one of
 * four, so the mark is scannable down a column; the tags then fill the secondary
 * slot, where they answer "which of these do I care about" without becoming
 * navigation. The schema has no `description` field, and a row with a title and
 * nothing else reads as broken.
 */
export function ListRow({ incident }: { incident: Incident }) {
  const topic = topicMeta(incident.topic);

  return (
    <li>
      <Link
        href={`/q/${incident.slug}`}
        className="flex items-center gap-item rounded-chip py-row-compact underline-offset-4 transition-[opacity,text-decoration-color] duration-(--dur-hover) ease-(--ease-out) hover:underline"
      >
        <TagMark tag={topic.label} />

        <span className="truncate text-body font-medium text-ink">
          {incident.title}
        </span>

        {incident.tags.length > 0 ? (
          <>
            <span aria-hidden className="mx-1 shrink-0 text-ink-3">
              &middot;
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-micro tracking-wider text-ink-3 uppercase">
              {incident.tags.join(" · ")}
            </span>
          </>
        ) : (
          <span className="flex-1" />
        )}

        <span className="ml-auto flex shrink-0 items-center gap-2">
          <DifficultyBadge level={incident.difficulty} />
          <time
            dateTime={incident.publishedAt}
            className="hidden font-mono text-micro text-ink-3 tabular-nums sm:inline"
          >
            {incident.publishedAt.slice(5).replace("-", "/")}
          </time>
        </span>
      </Link>
    </li>
  );
}

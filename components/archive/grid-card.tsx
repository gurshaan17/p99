import Link from "next/link";
import type { Incident } from "@/lib/incidents";
import { TagMark } from "@/components/ui/badge";

/**
 * Grid card — DESIGN.md section 7.4.
 *
 * An alternate view, not the default language. Hover strengthens the border and
 * adds a subtle shadow; nothing moves (section 7.4, section 9).
 *
 * The preview panel stands in for the reference's generated abstract diagram
 * (section 7.4) and shows the incident's actual question — what you would be
 * asked if you opened it. The previous version drew a hardcoded bar chart keyed
 * off difficulty, which was a picture of nothing (section 11: a panel must carry
 * information, not decoration).
 */
export function GridCard({ incident }: { incident: Incident }) {
  const [primary, ...rest] = incident.tags;

  return (
    <Link
      href={`/q/${incident.slug}`}
      className="group block rounded-card border border-line bg-page p-2 transition-[border-color,box-shadow] duration-(--dur-hover) ease-(--ease-out) hover:border-line-strong hover:shadow-card"
    >
      <div className="flex aspect-video overflow-hidden rounded-control bg-field p-3">
        <p className="line-clamp-4 text-small text-ink-3 text-pretty">
          {incident.question}
        </p>
      </div>

      <div className="px-1 pt-3 pb-1">
        <div className="text-body font-medium text-ink text-pretty">
          {incident.title}
        </div>
        <p className="mt-1 line-clamp-2 text-small text-ink-3 text-pretty">
          {incident.symptom}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pt-2 font-mono text-micro text-ink-3">
        <span className="flex min-w-0 items-center gap-1.5 uppercase tracking-wider">
          {primary ? <TagMark tag={primary} /> : null}
          <span className="truncate">
            {rest.length > 0 ? `${primary} · ${rest.join(" · ")}` : primary}
          </span>
        </span>
        <time dateTime={incident.publishedAt} className="shrink-0 tabular-nums">
          {incident.publishedAt.slice(5).replace("-", "/")}
        </time>
      </div>
    </Link>
  );
}

/**
 * Section header — DESIGN.md section 7.2.
 *
 * `[index] [display title] [description]` on one baseline, wrapping on mobile.
 *
 * `count` renders as a trailing mono tally, right-aligned on the row. It is
 * opt-in because most sections have nothing to count; a zero would be worse than
 * an absent slot (section 11).
 */
export function SectionHeader({
  index,
  title,
  description,
  count,
}: {
  index: string;
  title: string;
  description?: string;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="font-mono text-micro text-ink-3 tabular-nums">
        {index}
      </span>
      <h2 className="font-display text-lead font-medium text-ink">
        {title}
      </h2>
      {description ? (
        <p className="text-body text-ink-3 text-pretty">{description}</p>
      ) : null}
      {count !== undefined ? (
        <span className="ml-auto font-mono text-micro text-ink-3 tabular-nums">
          {count}
        </span>
      ) : null}
    </div>
  );
}

"use client";


/**
 * Archive filter — DESIGN.md section 7.6.
 *
 * A 32px inline chip that exposes its menu on hover *and* on focus-within, so
 * it is keyboard reachable rather than hover-only. Selecting a filter applies
 * it; the menu stays open so two filters can be combined.
 */
export function ArchiveFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="group/filter relative">
      <button
        type="button"
        data-touch-target
        aria-haspopup="listbox"
        aria-expanded="true"
        className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-body text-ink-2 transition-colors duration-(--dur-hover) ease-(--ease-out) hover:border-line-strong hover:text-ink"
      >
        <span className="text-ink-3">{label}</span>
        <span className="font-medium text-ink capitalize">{value}</span>
        <Chevron aria-hidden />
      </button>

      {/* Kept in the DOM and revealed by hover/focus-within, so the menu is
          always in the tab order and the browser's own focus handling works. */}
      <div
        role="listbox"
        aria-label={label}
        className="invisible absolute top-full left-0 z-30 mt-1 min-w-40 rounded-card border border-line bg-page p-1 opacity-0 shadow-float transition-[opacity,visibility] duration-(--dur-hover) ease-(--ease-out) group-hover/filter:visible group-hover/filter:opacity-100 group-focus-within/filter:visible group-focus-within/filter:opacity-100"
      >
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={o === value}
            onClick={() => onChange(o)}
            className={`block w-full rounded-chip px-2 py-1.5 text-left text-body transition-colors duration-(--dur-hover) hover:bg-field ${
              o === value ? "font-medium text-ink" : "text-ink-2"
            }`}
          >
            <span className="capitalize">{o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3 text-ink-3 transition-transform duration-(--dur-hover) group-hover/filter:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

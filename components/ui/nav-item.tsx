import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

/**
 * Navigation item — DESIGN.md section 7.1.
 *
 * flex / items-center / gap-0.5rem / rounded-chip / px-2 py-1.5 / text-body.
 * Counts are right-aligned mono, micro, tabular-nums (section 4.3).
 */
export function NavItem({
  href,
  icon: Icon,
  label,
  count,
  active = false,
  onNavigate,
  className = "",
}: {
  href: string;
  icon?: ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  /** e.g. close the mobile sheet on navigation */
  onNavigate?: () => void;
  className?: string;
}) {
  const accessibleCount =
    count === undefined ? undefined : `${label}, ${count}`;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={accessibleCount}
      className={`flex items-center gap-2 rounded-chip px-2 py-1.5 text-body transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-field ${
        active ? "font-medium text-ink" : "text-ink-2 hover:text-ink"
      } ${className}`}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="truncate">{label}</span>
      {count === undefined ? null : (
        <span className="ml-auto font-mono text-micro tabular-nums text-ink-3">
          {count}
        </span>
      )}
    </Link>
  );
}

/** Mono section label — DESIGN.md section 2.2 (`font-mono text-micro tracking-wider uppercase`). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 font-mono text-micro tracking-wider text-ink-3 uppercase">
      {children}
    </div>
  );
}

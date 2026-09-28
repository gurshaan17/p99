import type { ReactNode } from "react";

/**
 * Page shell — DESIGN.md sections 2.1, 5.1.
 *
 * A centred `60rem` max-width frame on a `lg` grid with an `18rem` +
 * `minmax(0, 1fr)` track. Both dimensions come from tokens (`--shell-width`,
 * `--sidebar-width`) rather than literals.
 *
 * Note: Tailwind's scanner reads class-shaped strings out of code comments too,
 * so reference classes are named in prose here rather than verbatim — see the
 * `@source not` note in `globals.css`.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-(--shell-width) lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:items-start">
      {children}
    </div>
  );
}

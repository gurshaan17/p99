"use client";

import { nav, topicNav } from "@/lib/nav";
import { Mark } from "./mark";
import { NavItem, SectionLabel } from "@/components/ui/nav-item";

/**
 * Desktop sidebar — DESIGN.md sections 2.2, 5.3.
 *
 * A column of identity, intro, navigation, topic sections, and footer — not a
 * stack of cards. `lg:sticky lg:top-0 lg:h-dvh` with a dashed right border
 * doing the split from the main pane.
 *
 * Exists only at `lg`; below that the mobile bar and sheet take over
 * (section 2.7).
 *
 * Client because active-route highlighting has to track navigation; there is no
 * static route list to precompute here.
 */
export function Sidebar() {
  return (
    <aside
      className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:border-r lg:border-dashed lg:border-line lg:px-(--pad-x) lg:pt-(--sidebar-pad-top)"
    >
      <Mark className="size-25 shrink-0 text-ink" />

      <div className="mt-5 font-pixel text-lead tracking-tight text-ink">
        p99
      </div>

      <p className="mt-2 max-w-(--measure-intro) text-body leading-relaxed text-ink">
        One production incident a day. Diagnose the system, not the algorithm.
      </p>

      <div className="my-5 border-t border-dashed border-line" />

      <SectionLabel>Navigation</SectionLabel>
      <nav aria-label="Main" className="flex flex-col">
        {nav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            count={item.count}
          />
        ))}
      </nav>

      <div className="my-5 border-t border-dashed border-line" />
      <SectionLabel>Sections</SectionLabel>
      <nav aria-label="Topics" className="flex flex-col">
        {topicNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            count={item.count}
            className="pl-3"
          />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="mt-5 border-t border-dashed border-line py-4 text-small text-ink-3">
        <div className="flex items-center gap-4">
          <a
            href="/about#newsletter"
            className="decoration-transparent underline-offset-4 hover:decoration-current hover:text-ink hover:underline"
          >
            Newsletter
          </a>
          <a
            href="/about"
            className="decoration-transparent underline-offset-4 hover:decoration-current hover:text-ink hover:underline"
          >
            Info
          </a>
        </div>
      </div>
    </aside>
  );
}

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
      <div className="flex flex-col gap-block">
        <Mark className="size-25 shrink-0 text-ink" />

        <div className="font-pixel text-lead tracking-tight text-ink">p99</div>

        <p className="max-w-(--measure-intro) text-body leading-relaxed text-ink">
          One production incident a day. Diagnose the system, not the algorithm.
        </p>
      </div>

      <div className="my-divider border-t border-dashed border-line" />

      <SectionLabel>Navigation</SectionLabel>
      {/*
        Primary nav and the topic list below share one row rhythm, deliberately
        and exactly — both render `NavItem`, so both come out at 36.8px with
        6px/6px padding and an 8px gap. The topics read as secondary because of
        the indent and the count, not because their rows are shorter; a
        different row height here would be an arbitrary mismatch, not a size
        step. (DESIGN.md 3.5 `--space-item`, 7.1 nav rows.)
      */}
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

      <div className="my-divider border-t border-dashed border-line" />
      <SectionLabel>Topics</SectionLabel>
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

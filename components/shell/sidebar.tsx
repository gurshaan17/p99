"use client";

import Link from "next/link";
import { nav, topicNav } from "@/lib/nav";
import { site } from "@/lib/site";
import { Mark } from "./mark";
import { FooterLinks } from "./footer-links";
import { NavItem, SectionLabel } from "@/components/ui/nav-item";
import type { ReactNode } from "react";

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
export function Sidebar({ children }: { children?: ReactNode }) {
  return (
    <aside
      className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:border-r lg:border-dashed lg:border-line lg:px-(--pad-x) lg:pt-(--sidebar-pad-top)"
    >
      <div className="flex flex-col gap-block">
        {/*
          The wordmark is a link home, not decoration. It sits directly above the
          intro rather than inside the nav list so it reads as identity, and it
          stays out of `nav` because that list is ordered and icon-driven — a bare
          text row there would break the rhythm `NavItem` sets (see the note
          below). The mark above it is a sibling, not part of the hit target, so
          the two do not read as one oversized control.
        */}
        <Mark className="size-25 shrink-0 text-ink" />

        <Link
          href="/"
          className="-ml-1 w-fit rounded-chip px-1 font-pixel text-lead tracking-tight text-ink underline-offset-4 transition-colors duration-(--dur-hover) hover:underline"
        >
          p99
        </Link>

        <p className="max-w-(--measure-intro) text-body leading-relaxed text-ink">
          {site.description}
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
        {children}
        <FooterLinks />
      </div>
    </aside>
  );
}

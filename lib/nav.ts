import { Archive, Flame, Info, type LucideIcon } from "lucide-react";
import { tagCounts } from "@/lib/incidents";

export type NavItemSpec = {
  href: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
};

export type TagNavSpec = {
  href: string;
  label: string;
  count: number;
};

/**
 * Sidebar navigation — DESIGN.md sections 2.2, 5.3.
 *
 * `count` is `undefined` where there is nothing to count yet; NavItem omits the
 * slot entirely rather than rendering a zero (section 11).
 */
export const nav: NavItemSpec[] = [
  { href: "/", label: "Today", icon: Info },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/topics", label: "Topics" },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/about", label: "About" },
];

/**
 * Tag filters shown under SECTIONS. Derived from real content via `tagCounts`,
 * never hand-listed, so a new incident's tags appear here without an edit.
 *
 * An incident can sit under more than one tag, so the per-tag counts sum to more
 * than the incident total. That is intended — it is a cross-index, not a
 * partition.
 */
export const tagNav: TagNavSpec[] = tagCounts.map(({ tag, count }) => ({
  href: `/topics#${tag}`,
  label: tag,
  count,
}));

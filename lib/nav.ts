import {
  Archive,
  BookOpen,
  Flame,
  Info,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { topicCounts } from "@/lib/incidents";

export type NavItemSpec = {
  href: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
};

export type TopicNavSpec = {
  href: string;
  label: string;
  count: number;
};

/**
 * Sidebar navigation — DESIGN.md sections 2.2, 5.3.
 *
 * `count` is `undefined` where there is nothing to count yet; NavItem omits the
 * slot entirely rather than rendering a zero (section 11).
 *
 * Every row carries an icon (section 11: 16px, `currentColor`, monochrome). Two
 * entries previously had none, which read as a missing value rather than a
 * deliberate absence — the topic list below has no icons precisely because it is
 * indented secondary navigation, so an unadorned primary row is ambiguous between
 * the two.
 */
export const nav: NavItemSpec[] = [
  { href: "/", label: "Today", icon: Info },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/topics", label: "Topics", icon: Layers },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/about", label: "About", icon: BookOpen },
];

/**
 * Topic sections shown under SECTIONS. Reads `topicCounts`, so the order and
 * the counts come from the same place `/topics` renders and cannot disagree.
 *
 * These used to be tags. The cross-index that produced was correct as a filter
 * and wrong as navigation: every incident repeated under each of its tags, and
 * `postgres` was both a section and a filter that returned everything.
 */
export const topicNav: TopicNavSpec[] = topicCounts.map((t) => ({
  href: `/topics#${t.id}`,
  label: t.label,
  count: t.count,
}));

import { Archive, Flame, Info, type LucideIcon } from "lucide-react";
import { topicCounts } from "@/lib/questions";

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
 */
export const nav: NavItemSpec[] = [
  { href: "/", label: "Today", icon: Info },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/topics", label: "Topics" },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/about", label: "About" },
];

/** Topic filters shown under SECTIONS. Derived from real content, never hand-listed. */
export const topicNav: TopicNavSpec[] = topicCounts.map(({ topic, count }) => ({
  href: `/topics#${topic.toLowerCase()}`,
  label: topic,
  count,
}));

import {
  Archive,
  Flame,
  Info,
  type LucideIcon,
} from "lucide-react";

export type NavItemSpec = {
  href: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  /** true → rendered under the SECTIONS label instead of NAVIGATION */
  inSections?: boolean;
};

/**
 * Sidebar navigation — DESIGN.md sections 2.2, 5.3.
 *
 * `count` is `undefined` where there is nothing to count yet; NavItem omits the
 * slot entirely rather than rendering a zero.
 */
export const nav: NavItemSpec[] = [
  { href: "/", label: "Today", icon: Info },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/topics", label: "Topics" },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/about", label: "About" },
];

/** Topic filters shown under SECTIONS. Empty until the first incident ships. */
export const sections: NavItemSpec[] = [];

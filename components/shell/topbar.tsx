import Link from "next/link";
import { Grid2x2, Mail, Plus, Search } from "lucide-react";
import { Control } from "@/components/ui/control";
import { Keycap } from "@/components/ui/keycap";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Mark } from "./mark";
import { MenuSheet } from "./mobile-nav";

/**
 * Main top bar — DESIGN.md sections 2.3, 2.7, 5.4.
 *
 * One bar at every width, laid out as a single flex row whose breakpoint
 * variants are toggled with `order` / `hidden` rather than rendered as two
 * stacked bars (section 2.7 asks for "a compact sticky bar", singular).
 *
 * Because it is one row, exactly one ThemeToggle is mounted, so the `T` shortcut
 * has exactly one listener. Two mounted copies would both fire and cancel out.
 *
 * Only the theme toggle carries a keycap: it is the only shortcut wired so far,
 * and section 17 forbids decorative keyboard hints. The ⌘K / ⌘E chips wait for
 * the command palette and random-question route. Search and view toggle render
 * `disabled` rather than pretending to work.
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-dashed border-line bg-page px-(--pad-x) py-2.5">
      <div className="flex items-center gap-1.5">
        {/* mobile identity */}
        <Link
          href="/"
          data-touch-target
          className="order-1 flex items-center gap-2 font-pixel text-body text-ink lg:hidden"
        >
          <Mark className="size-6" />
          p99
        </Link>

        <Control className="order-2 hidden px-2 text-ink lg:flex">
          <Mail className="size-4" strokeWidth={1.5} aria-hidden />
          Subscribe
        </Control>

        <Control
          aria-label="Suggest a topic"
          title="Suggest a topic"
          className="order-3 hidden lg:flex"
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        </Control>

        <div className="order-4 flex-1" />

        <Control
          aria-label="Search — not available yet"
          title="Search"
          disabled
          className="order-5 hidden lg:flex"
        >
          <Search className="size-4" strokeWidth={1.5} aria-hidden />
        </Control>

        <span aria-hidden className="order-6 mx-1 hidden h-4 w-px bg-line lg:block" />

        <Control
          aria-label="Grid view — not available yet"
          title="Grid view"
          disabled
          className="order-7 hidden lg:flex"
        >
          <Grid2x2 className="size-4" strokeWidth={1.5} aria-hidden />
        </Control>

        <div className="order-8">
          <ThemeToggle />
        </div>

        <span className="order-9 hidden lg:inline-flex">
          <Keycap>T</Keycap>
        </span>

        <div className="order-10 lg:hidden">
          <MenuSheet />
        </div>
      </div>
    </header>
  );
}

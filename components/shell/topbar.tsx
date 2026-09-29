import Link from "next/link";
import { Mail, Plus, Rss } from "lucide-react";
import { Control } from "@/components/ui/control";
import { Keycap } from "@/components/ui/keycap";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Mark } from "./mark";
import { MenuSheet } from "./mobile-nav";
import { SearchControl } from "./search-control";

/**
 * Main top bar — DESIGN.md sections 2.3, 2.7, 5.4.
 *
 * One bar at every width, laid out as a single flex row whose breakpoint
 * variants are toggled with `order` / `hidden` rather than rendered as two
 * stacked bars (section 2.7 asks for "a compact sticky bar", singular).
 *
 * Because it is one row, exactly one ThemeToggle and one CommandPalette are
 * mounted, so the `T` and `⌘K` shortcuts each have exactly one listener. Two
 * mounted copies would both fire and cancel out.
 *
 * Subscribe and Suggest are real links to their sections on /about rather than
 * controls that appear to do something. The list/grid view switch lives with
 * the archive's own filters, not here, because it only means anything on a
 * route that has two views.
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

        <Control asChild className="order-2 hidden lg:flex">
          <Link href="/about#newsletter" className="px-2">
            <Mail className="size-4" strokeWidth={1.5} aria-hidden />
            Subscribe
          </Link>
        </Control>

        <Control
          asChild
          className="order-3 hidden lg:flex"
        >
          <Link href="/about#suggest" aria-label="Suggest a topic">
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          </Link>
        </Control>

        <div className="order-4 flex-1" />

        <div className="order-5 hidden lg:flex">
          <SearchControl />
        </div>

        <span aria-hidden className="order-6 mx-1 hidden h-4 w-px bg-line lg:block" />

        <div className="order-7">
          <ThemeToggle />
        </div>

        {/*
          RSS, in the same `Control` icon language as the theme toggle (section
          11: 16px, stroke 1.5, `currentColor`). A link rather than a control that
          fetches and opens a reader, since the browser and every feed reader
          already handle the format.
        */}
        <div className="order-7.5 hidden lg:flex">
          <Control asChild>
            <a href="/rss.xml" aria-label="RSS feed" title="RSS feed">
              <Rss className="size-4" strokeWidth={1.5} aria-hidden />
            </a>
          </Control>
        </div>

        <span aria-hidden className="order-8 hidden lg:inline-flex">
          <Keycap>T</Keycap>
        </span>

        <div className="order-9 lg:hidden">
          <MenuSheet />
        </div>
      </div>
    </header>
  );
}

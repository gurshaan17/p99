"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Control } from "@/components/ui/control";
import { Keycap } from "@/components/ui/keycap";
import { CommandPalette } from "./command-palette";

/**
 * Topbar search affordance plus the palette it opens.
 *
 * The two live together so the open state has one owner: the ⌘K listener
 * belongs to the palette, and the button that summons it needs that same state.
 * Exactly one of each is mounted, mirroring the theme toggle's single-listener
 * rule.
 */
export function SearchControl() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Control
        aria-label="Search — ⌘K"
        title="Search  ⌘K"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="px-2"
      >
        <Search className="size-4" strokeWidth={1.5} aria-hidden />
        <Keycap>⌘K</Keycap>
      </Control>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

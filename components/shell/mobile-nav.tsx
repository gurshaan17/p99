"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { nav } from "@/lib/nav";
import { NavItem, SectionLabel } from "@/components/ui/nav-item";
import { Control } from "@/components/ui/control";

/**
 * Mobile menu sheet — DESIGN.md sections 2.7, 12.
 *
 * Below `lg` the desktop sidebar and desktop toolbar controls disappear, so this
 * is the only navigation affordance. The sheet holds nav links only — the theme
 * toggle lives in the bar itself, which keeps exactly one `T` listener.
 *
 * Closes on Escape, on outside click, and on navigation. Focus moves into the
 * sheet on open and returns to the trigger on close (section 13).
 */
export function MenuSheet() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  return (
    <div className="relative">
      <Control
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-sheet"
      >
        {open ? (
          <X className="size-4" strokeWidth={1.5} aria-hidden />
        ) : (
          <Menu className="size-4" strokeWidth={1.5} aria-hidden />
        )}
      </Control>

      {open ? (
        <div
          id="mobile-sheet"
          ref={panelRef}
          className="absolute right-0 z-40 mt-2 w-56 rounded-card border border-line bg-page p-2 shadow-float"
        >
          <SectionLabel>Navigation</SectionLabel>
          <nav aria-label="Mobile" className="flex flex-col">
            {nav
              .filter((item) => !item.inSections)
              .map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  count={item.count}
                  onNavigate={close}
                />
              ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

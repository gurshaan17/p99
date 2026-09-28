"use client";

import { useSyncExternalStore } from "react";
import { LayoutGrid, List } from "lucide-react";

/**
 * Archive view switch — DESIGN.md section 7.1.
 *
 * Two icon buttons in one pill, mutually exclusive. The choice persists in
 * localStorage.
 *
 * The stored value is read through `useSyncExternalStore` rather than an effect:
 * localStorage *is* the external store, and this reads it on the server snapshot
 * path too, so there is no hydration mismatch and no cascading render. Same
 * pattern as the theme toggle, for the same reason.
 *
 * The list/grid switch lives here rather than in the global topbar because it
 * only means something on a route that has two views; the archive is the only
 * one.
 */

const KEY = "p99:archive-view";
const EVENT = "p99:archive-view-change";

export type ArchiveView = "list" | "grid";

/** Same-tab writes do not fire `storage`, so the toggle dispatches this too. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function getSnapshot(): ArchiveView {
  const stored = window.localStorage.getItem(KEY);
  return stored === "grid" ? "grid" : "list";
}

/** Server has no localStorage, and the default view is the design default. */
function getServerSnapshot(): ArchiveView {
  return "list";
}

export function useArchiveView(): [ArchiveView, (v: ArchiveView) => void] {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = (next: ArchiveView) => {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(EVENT));
  };

  return [view, set];
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: ArchiveView;
  onChange: (v: ArchiveView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Archive view"
      className="flex items-center gap-0.5 rounded-full border border-line p-0.5"
    >
      <Toggle
        label="List view"
        active={view === "list"}
        onClick={() => onChange("list")}
      >
        <List aria-hidden className="size-4" strokeWidth={1.5} />
      </Toggle>
      <Toggle
        label="Grid view"
        active={view === "grid"}
        onClick={() => onChange("grid")}
      >
        <LayoutGrid aria-hidden className="size-4" strokeWidth={1.5} />
      </Toggle>
    </div>
  );
}

function Toggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      data-touch-target
      className={`flex size-7 items-center justify-center rounded-full transition-colors duration-(--dur-hover) ease-(--ease-out) ${
        active ? "bg-field text-ink" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

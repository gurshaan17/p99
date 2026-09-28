"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Control } from "./control";

/**
 * Server renders `false`, client renders `true`, and the value only settles
 * after hydration — without the effect+setState mount guard, which the React
 * hooks lint rules reject as a cascading render.
 */
const subscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/**
 * Theme toggle — DESIGN.md sections 6.3b, 7.5.
 *
 * Shows the icon of the mode you would switch *to*. Renders a stable placeholder
 * until hydrated so server and client markup agree (next-themes requirement).
 * The `T` shortcut is bound here and is real (section 13).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const isDark = resolvedTheme === "dark";

  const toggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el?.isContentEditable) return;
      if (e.key === "t" || e.key === "T") toggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Gate every theme-derived value on `hydrated`, not just the icon: the server
  // has no way to know the resolved theme, so an ungated label/aria-label
  // mismatches on hydration under a dark system preference.
  const showDark = hydrated && isDark;
  const label = showDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Control
      onClick={toggle}
      aria-label={label}
      aria-keyshortcuts="T"
      title={label}
    >
      {showDark ? (
        <Sun className="size-4" strokeWidth={1.5} aria-hidden />
      ) : (
        <Moon className="size-4" strokeWidth={1.5} aria-hidden />
      )}
    </Control>
  );
}

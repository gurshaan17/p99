/**
 * Keyboard shortcut chip — DESIGN.md section 7.6.
 *
 * Decorative affordance only: it is `aria-hidden` and the real shortcut is
 * advertised on the control itself via `aria-keyshortcuts` (section 13).
 * Never render one without a working shortcut (section 17).
 */
export function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      aria-hidden
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-chip bg-field px-1 font-mono text-micro text-ink-3"
    >
      {children}
    </kbd>
  );
}

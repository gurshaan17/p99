import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

/**
 * Toolbar control — DESIGN.md section 7.5.
 *
 * 32px, rounded-control, muted text, hover field plate, 0.98 active press.
 * Visual size is 32px; the 40px touch target is handled by the caller at
 * pointer-coarse widths (section 12).
 */
export function Control({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      data-touch-target
      className={`inline-flex h-8 items-center gap-1.5 rounded-control px-1.5 text-ink-3 transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-field hover:text-ink active:scale-[0.98] ${className}`}
      {...props}
    />
  );
}

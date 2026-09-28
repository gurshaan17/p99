import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Buttons — DESIGN.md sections 7.7, 7.8.
 *
 * Primary is the ink-filled 40px action; ghost is the text-plus-underline action
 * that the reference prefers over a bordered button. No filled accent buttons
 * exist (section 17).
 */

const base =
  "inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-(--dur-hover) ease-(--ease-out) active:scale-(--press)";

const variants = {
  /** 40px, ink background, page text. Use sparingly (section 7.7). */
  primary: `${base} h-10 rounded-control bg-ink px-4 text-body text-page hover:bg-ink-2`,
  /** Text + underline. Preferable to a bordered button (section 7.8). */
  ghost: `${base} decoration-transparent text-body text-ink-3 underline-offset-4 hover:text-ink hover:underline`,
} as const;

type CommonProps = { children: ReactNode; className?: string };

export function PrimaryButton({
  children,
  className = "",
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      data-touch-target
      className={`${variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostLink({
  children,
  className = "",
  ...props
}: CommonProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      data-touch-target
      className={`${variants.ghost} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

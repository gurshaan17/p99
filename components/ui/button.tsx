import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Buttons — DESIGN.md sections 7.7, 7.8.
 *
 * Primary is the ink-filled 40px action; ghost is the text-plus-underline action
 * that the reference prefers over a bordered button. Danger is the outlined
 * destructive action. No filled accent buttons exist (section 17).
 */

const base =
  "inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-(--dur-hover) ease-(--ease-out) active:scale-(--press)";

const variants = {
  /** 40px, ink background, page text. Use sparingly (section 7.7). */
  primary: `${base} h-10 rounded-control bg-ink px-4 text-body text-page hover:bg-ink-2`,
  /** Text + underline. Preferable to a bordered button (section 7.8). */
  ghost: `${base} decoration-transparent text-body text-ink-3 underline-offset-4 hover:text-ink hover:underline`,
  /**
   * Outlined, 32px, danger-coloured. Section 7.8.
   *
   * Outline rather than fill, which is the only reason this is allowed to be
   * coloured at all: section 7.7 forbids bright filled buttons, and a solid red
   * block at the bottom of an article is that. A hairline in `--danger` costs one
   * glance to read and none at rest.
   *
   * The border sits at partial opacity and only goes solid on hover, so a page
   * that carries one of these is not permanently red — the colour has to say
   * "this is the way to undo things", not "something is wrong". The fill on hover
   * is `--danger` at 5%: enough to register under the cursor, far too little to
   * read as a pressed state on a neutral surface.
   *
   * 32px rather than section 7.7's 40px. This action is deliberately the
   * smallest thing in the article — it is the one control whose effect is not
   * local to where it sits, so it should not compete with the answer it sits
   * under. `data-touch-target` covers the coarse-pointer minimum.
   */
  danger: `${base} h-8 rounded-control border border-danger/40 px-3 text-small text-danger hover:border-danger hover:bg-danger/5`,
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
      // Section 7.5: a `<button>` sets its own cursor — preflight leaves it on the
      // UA arrow. This one did not, so "Lock in" and "Submit self-check" pointed
      // at the reader rather than at what they could press.
      className={`${variants.primary} cursor-pointer disabled:cursor-default ${className}`}
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

/**
 * Destructive action — outlined in `--danger`, never filled (section 7.8).
 *
 * The label carries the verb and the consequence, so the colour is a second
 * channel rather than the only one; section 13 does not require it here, but a
 * control this irreversible should not depend on the reader recognising red.
 */
export function DangerAction({
  children,
  className = "",
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      data-touch-target
      className={`${variants.danger} cursor-pointer disabled:cursor-default ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

/**
 * Toolbar control — DESIGN.md section 7.5.
 *
 * 32px, rounded-control, muted text, hover field plate, tokenized press scale.
 * Visual size is 32px; the 40px touch target is handled by the caller at
 * pointer-coarse widths (section 12).
 *
 * Renders a `<button>` by default. Pass `asChild` with a single `<Link>` or
 * `<a>` child to get a link that looks like a control, rather than a button
 * that navigates — the markup should match the behaviour.
 *
 * `cursor-pointer` is not redundant. Tailwind v4's preflight does not set a
 * cursor on `button`, and only `a[href]` gets a pointer from the UA stylesheet,
 * so a `button`-rendering control is the one case that otherwise keeps the
 * default arrow and reads as unclickable while doing exactly what the `<a>`
 * controls next to it do.
 */
export function Control({
  className = "",
  asChild = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const classes = `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control px-1.5 text-ink-3 transition-colors duration-(--dur-hover) ease-(--ease-out) hover:bg-field hover:text-ink active:scale-(--press) disabled:cursor-default disabled:opacity-60 ${className}`;

  if (asChild) {
    return cloneChild(children, classes);
  }

  return (
    <button
      type="button"
      data-touch-target
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Applies control styling to a single element child without adding a wrapper.
 * The child supplies its own `href` and any additional props; only styling and
 * the touch-target hook are merged in.
 */
function cloneChild(children: ReactNode, className: string) {
  if (!isValidElement(children)) return children;
  const child = children as ReactElement<{ className?: string }>;
  return cloneElement(child, {
    className: [className, child.props.className].filter(Boolean).join(" "),
  });
}

/**
 * Identity mark — DESIGN.md sections 2.2, 5.3, 11.
 *
 * A latency histogram: a run of healthy p50/p95 bars and one accented p99 bar.
 * Custom abstract mark, not a copy of the reference orb. Bars are expressed as
 * data and inherit theme via currentColor, so the mark has no second palette
 * to keep in sync.
 */
const BARS = [30, 36, 33, 41, 38, 44, 40, 48, 45, 56] as const;
/** index of the p99 bar — the single highlighted element (section 1.5) */
const P99 = 9;

const CELL = 100 / BARS.length;

/**
 * Optical centring, in viewBox units.
 *
 * Every bar is anchored to the bottom edge, so the ink occupies only the bottom
 * `TALLEST / 100` of a square viewBox and its centre falls 22% below the box
 * centre. Left alone, a `size-6` mark in the mobile topbar sat 5.3px lower than
 * the wordmark beside it, and a `size-25` one 22px lower than its own caption —
 * the mark looked misaligned rather than bottom-heavy, because the box is what
 * gets centred and the box is mostly air.
 *
 * Lifting by half the empty band splits the padding evenly above and below, which
 * centres the glyph without changing the box, the aspect ratio, or the shape of
 * the histogram. Derived from the data, so editing `BARS` cannot desync it.
 */
const TALLEST = Math.max(...BARS);
const INK_LIFT = (100 - TALLEST) / 2;

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="p99"
      className={className}
    >
      <g transform={`translate(0 ${-INK_LIFT})`}>
        {BARS.map((height, i) => {
          const isP99 = i === P99;
          return (
            <rect
              key={i}
              x={i * CELL + CELL * 0.18}
              y={100 - height}
              width={CELL * 0.64}
              height={height}
              rx={1.5}
              className={isP99 ? "fill-accent-ink" : "fill-ink-3"}
              opacity={isP99 ? 1 : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
}

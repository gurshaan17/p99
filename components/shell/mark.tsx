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

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="p99"
      className={className}
    >
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
    </svg>
  );
}

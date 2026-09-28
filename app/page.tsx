/**
 * Today — DESIGN.md section 8.1.
 *
 * Placeholder for the shell milestone. The composed home page (promo panel,
 * `01 Today's incident`, featured surface, `02 Recent` rows, `View archive`)
 * lands with the section-header, promo-panel, and list-row build steps.
 */
export default function TodayPage() {
  return (
    <div className="border-b border-dashed border-line px-(--pad-x) py-(--pad-y)">
      <h1 className="font-display text-title text-ink">Today</h1>
      <p className="mt-2 max-w-(--measure-prose) text-body text-ink-3">
        The shell is in place. Incident content ships next.
      </p>
    </div>
  );
}

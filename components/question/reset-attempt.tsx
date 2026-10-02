"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Incident } from "@/lib/incidents";
import { useAttempt, resetAttempt } from "@/hooks/useAttempt";
import { hasProgress } from "@/lib/attempts";
import { DangerAction } from "@/components/ui/button";

/**
 * Start over — DESIGN.md section 8.2.
 *
 * Discards the reader's attempt at this incident: the picked options, the prose,
 * the lock-in, the rubric ticks and the self-score, in one action. It is a
 * single control rather than a per-field undo because the attempt is the unit the
 * reader thinks in — "I want to do that one again" — and a row of clear buttons
 * would make them choose which half of their own answer they meant.
 *
 * It sits at the end of the flow, after the score and after the things to
 * remember, for two reasons. Everything it destroys is above it, so a reader who
 * wants it has already seen all of it; and it is the only control on the page
 * whose effect is not local to where it sits, which is what belongs after the
 * conclusion rather than inside `04 Your prediction`.
 *
 * Outlined in `--danger`, which is the one place on the site a colour is allowed
 * to mean something. It is the only irreversible action here, and it was a ghost
 * text link until it was not — a reader scanning the end of the article had no
 * way to tell that this sentence and every other quiet sentence were different in
 * kind. The outline is a hairline at partial opacity rather than a filled block,
 * so the page is not permanently red, and the label still carries the verb and the
 * consequence so nothing rests on recognising the colour.
 *
 * No confirmation step, and the reason is in `resetAttempt`: a dialog in front of
 * a choice the reader has already made by reading the label is chrome arguing
 * with them. The label says what it discards, and the line underneath confirms
 * afterwards that it happened.
 *
 * Two consequences worth stating out loud rather than hiding, since a reader can
 * undo neither: the streak day this attempt earned goes with it (section 8.3
 * counts submissions, not history), and the archive's `read · solved` mark goes
 * with it (section 8.4 derives from the same record).
 */
export function ResetAttempt({ incident }: { incident: Incident }) {
  const attempt = useAttempt(incident.slug);
  const [reset, setReset] = useState(false);

  const started = hasProgress(attempt);

  // Replaced by a quiet confirmation line rather than a second control, the way
  // section 8.5 replaces its form after a successful signup. Deliberately neutral:
  // the line is a report of a finished action, not a control, and keeping the
  // danger tint on it would leave a red mark on a page that is now back to a
  // blank form. Gated on `started` so a reader who starts typing again gets the
  // control back instead of a stale "cleared" message over a half-written answer.
  if (reset && !started) {
    return (
      <p role="status" className="text-small text-ink-3 text-pretty">
        Reset. Your picks, your answer and your score for this incident are
        cleared.
      </p>
    );
  }

  if (!started) return null;

  return (
    <div className="flex flex-col gap-item">
      {/*
        Block stack rather than the sentence sitting on the button's baseline. A
        bordered control has a box, and a line of text sharing its baseline reads
        as a label hanging off the edge of it — at 375px the wrap also left the
        sentence's first word alone on a row under the button.
      */}
      <div>
        <DangerAction
          onClick={() => {
            resetAttempt(incident.slug);
            setReset(true);
          }}
        >
          <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
          Start this incident over
        </DangerAction>
      </div>
      <p className="max-w-[52ch] text-small text-ink-3 text-pretty">
        Clears your picks, your answer, your score, and the streak day this earned.
        This cannot be undone.
      </p>
    </div>
  );
}

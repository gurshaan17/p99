"use client";

import { useSyncExternalStore } from "react";
import { ATTEMPT_EVENT, readCompletedAttempts, type Attempt } from "@/lib/attempts";

/**
 * Reader streak — DESIGN.md section 8.3.
 *
 * A contribution grid driven by what the reader has actually done, not by what
 * the site has published. The published-date grid on the page above it is the
 * site-level view; this is the personal one, and it only exists once there is a
 * local attempt to count.
 *
 * Aggregates across every slug, so it cannot be a per-incident snapshot the way
 * `useAttempt` is — but it is still an external store, so it is still read
 * through `useSyncExternalStore` rather than a `useState` + effect. The snapshot
 * is a `Stats` object, which means it has to be referentially stable or React
 * loops; the cache keys on a version string built from the completed slugs and
 * their submission timestamps, so the arithmetic only reruns when the underlying
 * data actually changed. This also means submitting a self-check in this tab
 * updates the streak without a reload, which an effect-on-mount would have
 * missed.
 *
 * Deliberately still keyed on `submittedAt`, while the archive's `read · solved`
 * mark moved to lock-in. The two answer different questions — "was this reader
 * shown the answer" against "did this reader finish scoring themselves against
 * it" — and a streak day for merely locking in would be a streak of page views.
 * So `readCompletedAttempts` narrows the archive's wider resolved set rather than
 * sharing it.
 *
 * The server snapshot is a constant zero, so the first paint is the empty state
 * and a returning reader's real numbers arrive straight after hydration without a
 * mismatch warning. Section 8.3's "informational rather than gamified" is also why
 * that transition is unremarkable: no badge, no flash, no celebration.
 *
 * Day boundaries are local, not UTC. "Did I do something today" is a question
 * about the reader's clock, and a submission at 23:30 local time is today even
 * though it is tomorrow in UTC.
 */

const EMPTY: Stats = { current: 0, longest: 0, completed: 0 };
let cache: { version: string; value: Stats } | null = null;

function getSnapshot(): Stats {
  const completed = readCompletedAttempts();

  const version = JSON.stringify(
    [...completed]
      .map(([slug, attempt]) => `${slug}@${attempt.submittedAt ?? ""}`)
      .sort(),
  );
  if (cache && cache.version === version) return cache.value;

  const value = computeStreak(completed);
  cache = { version, value };
  return value;
}

function getServerSnapshot(): Stats {
  return EMPTY;
}

/** Same-tab writes do not fire `storage`, so the attempt actions dispatch this. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ATTEMPT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ATTEMPT_EVENT, onChange);
  };
}

export function StreakRecord() {
  const stats = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (stats.completed === 0) {
    return (
      <p className="text-body text-ink-2 text-pretty">
        No completed self-checks yet. Lock in a prediction on an incident, read the
        solution, then submit the self-check — that is what counts toward your
        streak.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-item">
      <dl className="grid grid-cols-3 gap-block">
        <Stat term="Current streak" value={stats.current} unit={plural(stats.current, "day")} />
        <Stat term="Longest streak" value={stats.longest} unit={plural(stats.longest, "day")} />
        <Stat
          term="Completed"
          value={stats.completed}
          unit={plural(stats.completed, "incident")}
        />
      </dl>
      <p className="text-small text-ink-3 text-pretty">
        A day counts once you have submitted a self-check. Streaks are stored in
        this browser only — clearing site data clears them.
      </p>
    </div>
  );
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

function Stat({
  term,
  value,
  unit,
}: {
  term: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-micro tracking-wider text-ink-3 uppercase">
        {term}
      </dt>
      <dd className="font-display text-lead font-medium text-ink tabular-nums">
        {value}
        <span className="font-sans text-small font-normal text-ink-3">
          {" "}
          {unit}
        </span>
      </dd>
    </div>
  );
}

interface Stats {
  current: number;
  longest: number;
  completed: number;
}

/** Local-calendar day key, `YYYY-MM-DD`. */
function dayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function computeStreak(completed: Map<string, Attempt>): Stats {
  const days = new Set<string>();
  for (const attempt of completed.values()) {
    if (!attempt.submittedAt) continue;
    const when = new Date(attempt.submittedAt);
    if (Number.isNaN(when.getTime())) continue;
    days.add(dayKey(when));
  }

  const sorted = [...days].sort();
  const completedCount = completed.size;
  if (sorted.length === 0) return { current: 0, longest: 0, completed: completedCount };

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const shiftDays = (from: Date, by: number) => {
    const next = new Date(from);
    next.setDate(next.getDate() + by);
    return next;
  };

  // Longest run over the whole history.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const previous = new Date(`${sorted[i - 1]}T00:00:00`);
    const current = new Date(`${sorted[i]}T00:00:00`);
    const gapDays = Math.round(
      (current.getTime() - previous.getTime()) / 86_400_000,
    );
    run = gapDays === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current run: consecutive days ending today, or ending yesterday. Yesterday
  // still counts so an unfinished today does not read as a broken streak the
  // moment the page is opened in the morning.
  let cursor = new Date(midnight);
  if (!days.has(dayKey(cursor))) {
    cursor = shiftDays(cursor, -1);
    if (!days.has(dayKey(cursor))) {
      return { current: 0, longest, completed: completedCount };
    }
  }

  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = shiftDays(cursor, -1);
  }

  return { current, longest, completed: completedCount };
}

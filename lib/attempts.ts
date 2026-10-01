/**
 * Per-incident attempt storage — DESIGN.md section 8.2.
 *
 * One record per incident under `p99:attempt:<slug>`, plus a `p99:attempts:index:v2`
 * holding the slugs the reader has locked in, so the archive can find them
 * without enumerating every key.
 *
 * Everything here is defensive by construction. localStorage is a user-writable,
 * cross-version, occasionally-corrupt string store: it throws in private-mode
 * Safari and when the quota is full, it can hold JSON from an older schema, and
 * a reader can hand-edit any of it. No read is allowed to throw and no write is
 * allowed to lose the reader's other answers, so every entry point falls back to
 * an empty attempt and every write is a merge rather than a replace.
 *
 * Not a security boundary. The schema is entirely client-side and the diagnosis
 * is already in the page payload, so locking in an answer is a pacing device for
 * the reader, not a gate (the same reasoning as `components/question/reveal.tsx`).
 */

export interface Attempt {
  slug: string;
  /** pick id -> chosen option id */
  pickAnswers: Record<string, string>;
  freeText: string;
  /** ISO timestamp; null until the reader locks in. */
  lockedAt: string | null;
  /** rubric item text -> checked. */
  rubricChecks: Record<string, boolean>;
  /** ISO timestamp; null until the self-check is submitted. */
  submittedAt: string | null;
}

export const ATTEMPT_PREFIX = "p99:attempt:";
/**
 * `:v2` because the index's membership rule changed from "self-check submitted" to
 * "locked in" — see `writeIndex` for why a stale one cannot be detected from the
 * outside and has to be made a miss instead.
 */
export const ATTEMPT_INDEX_KEY = "p99:attempts:index:v2";
const LEGACY_ATTEMPT_INDEX_KEY = "p99:attempts:index";
export const ATTEMPT_EVENT = "p99:attempt-change";

/** Soft cap on the free-text answer. Enforced in the textarea, not here. */
export const FREE_TEXT_MAX = 600;

export function attemptKey(slug: string): string {
  return `${ATTEMPT_PREFIX}${slug}`;
}

export function emptyAttempt(slug: string): Attempt {
  return {
    slug,
    pickAnswers: {},
    freeText: "",
    lockedAt: null,
    rubricChecks: {},
    submittedAt: null,
  };
}

export function isLocked(attempt: Attempt): boolean {
  return attempt.lockedAt !== null;
}

export function isSubmitted(attempt: Attempt): boolean {
  return attempt.submittedAt !== null;
}

/**
 * Read to the end, with the solution revealed — the one state the archive marks.
 *
 * A single timestamp rather than the pair it used to require. Lock-in is the
 * moment both halves of "read it" become true at once: nothing below the form is
 * in the DOM until it fires, and the reveal is what fires it. Requiring a
 * submitted self-check on top meant a reader who locked in, read the diagnosis and
 * closed the tab was recorded as never having read it — which is the one thing the
 * mark is supposed to say, and it was false. The self-check scores the answer; it
 * is not evidence of attention.
 *
 * Still derived rather than stored, and still no key of its own. `lockedAt` is
 * already written by the same button that reveals the solution, so a separate
 * `p99:read:<slug>` would be a third copy of a fact the attempt record holds.
 *
 * Narrower than it was, in one direction only: the record is user-writable, so a
 * hand-edited `lockedAt` on an attempt with no picks claims a read the reader may
 * not have done. Accepted for the same reason the old pair was checked at all —
 * the schema is a pacing device, not a security boundary (see the module note).
 */
export function isResolved(attempt: Attempt): boolean {
  return isLocked(attempt);
}

/**
 * Whether the reader has put anything into this attempt at all.
 *
 * Gates the reset control, and deliberately counts a draft: two picks and no
 * lock-in is progress the reader can see and would want to undo, and hiding the
 * control until they have committed would leave them with no way back from a
 * half-finished answer.
 *
 * The rubric is checked by value, not by key. `setRubricCheck` writes the entry
 * on untick as well as on tick, so a reader who ticked something and then
 * unticked it has one key holding `false` and nothing else — and by key that
 * record would render a "start over" control over an empty attempt.
 */
export function hasProgress(attempt: Attempt): boolean {
  return (
    Object.keys(attempt.pickAnswers).length > 0 ||
    attempt.freeText !== "" ||
    isLocked(attempt) ||
    Object.values(attempt.rubricChecks).some(Boolean) ||
    isSubmitted(attempt)
  );
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

function booleanMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "boolean") out[key] = item;
  }
  return out;
}

/** Accepts an ISO string, rejects anything else. Malformed dates stay null. */
function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

/**
 * Coerce arbitrary parsed JSON into a valid Attempt, field by field. Anything
 * unrecognised is dropped rather than trusted, so a truncated or hand-edited
 * entry degrades to the parts that survived instead of poisoning the render.
 */
export function parseAttempt(slug: string, raw: string | null): Attempt {
  if (raw === null) return emptyAttempt(slug);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyAttempt(slug);
  }

  if (!isRecord(parsed)) return emptyAttempt(slug);

  return {
    slug,
    pickAnswers: stringMap(parsed.pickAnswers),
    freeText: typeof parsed.freeText === "string" ? parsed.freeText : "",
    lockedAt: timestamp(parsed.lockedAt),
    rubricChecks: booleanMap(parsed.rubricChecks),
    submittedAt: timestamp(parsed.submittedAt),
  };
}

/** localStorage access that can fail silently and never throws. */
function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Safari private mode throws on property access, not just on writes.
    return null;
  }
}

export function readAttempt(slug: string): Attempt {
  const storage = safeStorage();
  if (!storage) return emptyAttempt(slug);
  try {
    return parseAttempt(slug, storage.getItem(attemptKey(slug)));
  } catch {
    return emptyAttempt(slug);
  }
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ATTEMPT_EVENT));
}

function writeAttempt(attempt: Attempt): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(attemptKey(attempt.slug), JSON.stringify(attempt));
  } catch {
    // Quota exceeded or storage disabled. The in-memory cache in the hook still
    // reflects the change, so the reader keeps the session; it just will not
    // survive a reload, which is strictly better than throwing mid-keystroke.
  }
  syncIndex(attempt.slug, attempt);
  notify();
}

/**
 * The resolved-attempt index, rebuilt from the single record we just wrote.
 * Lock-in is the only transition that can add or remove a slug, so this is the
 * only place the index needs touching.
 */
function syncIndex(slug: string, attempt: Attempt): void {
  const current = readIndex();
  const has = current.includes(slug);
  const should = isResolved(attempt);

  if (has === should) return;

  writeIndex(
    should ? [...current, slug] : current.filter((item) => item !== slug),
  );
}

/**
 * The one write path for the index, and the one place the pre-`:v2` key is
 * dropped.
 *
 * The version suffix is a migration, not decoration. The index used to name
 * *submitted* slugs and now names *locked-in* ones, and the fast path trusts
 * whatever the index says — so a returning reader's existing index would be a
 * strictly smaller set than their records support, and the lock-ins it is missing
 * would never be marked read. Missing is not a state the repair path can detect:
 * `readIndex` returns a populated list, so it is taken at face value.
 *
 * A fresh key makes the old one a miss, which is the one condition the repair path
 * already handles — it enumerates the attempt records, which are the durable copy,
 * and rebuilds. So the version bump converts "silently incomplete" into "rebuilt on
 * first read", and the stale key is removed rather than left to rot beside it.
 */
function writeIndex(slugs: string[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(ATTEMPT_INDEX_KEY, JSON.stringify(slugs));
    storage.removeItem(LEGACY_ATTEMPT_INDEX_KEY);
  } catch {
    /* index is an optimisation; `readResolvedAttempts` rebuilds it from the records */
  }
}

export function readIndex(): string[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(ATTEMPT_INDEX_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function enumerateAttemptSlugs(): string[] {
  const storage = safeStorage();
  if (!storage) return [];
  const slugs: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(ATTEMPT_PREFIX)) slugs.push(key.slice(ATTEMPT_PREFIX.length));
    }
  } catch {
    return [];
  }
  return slugs;
}

function repairIndex(slugs: string[]): void {
  writeIndex(slugs);
}

/**
 * Every resolved attempt, keyed by slug.
 *
 * The index is the fast path: it names the resolved slugs, so the common read is
 * a handful of `getItem` calls rather than a walk of every key in localStorage
 * (which is O(all keys on the origin), not O(our keys)).
 *
 * When the index is missing entirely the records are enumerated instead and the
 * index is rebuilt, so clearing the index alone does not lose a reader's history,
 * and so does the `:v2` bump in `ATTEMPT_INDEX_KEY` for readers arriving from the
 * old membership rule. The one case this cannot repair is a *partial* index — a
 * slug that was locked in while the index write failed, e.g. mid-quota-exhaustion.
 * That is accepted: an index write and an attempt write failing in the same breath
 * means storage is already unhealthy, and the attempt record is the durable copy.
 */
export function readResolvedAttempts(): Map<string, Attempt> {
  const resolved = new Map<string, Attempt>();

  const indexed = readIndex();
  if (indexed.length === 0) {
    for (const slug of enumerateAttemptSlugs()) {
      const attempt = readAttempt(slug);
      if (isResolved(attempt)) resolved.set(slug, attempt);
    }
    repairIndex([...resolved.keys()]);
    return resolved;
  }

  for (const slug of indexed) {
    const attempt = readAttempt(slug);
    if (isResolved(attempt)) resolved.set(slug, attempt);
  }

  return resolved;
}

/**
 * Every self-checked attempt, keyed by slug — the narrower set `/streak` counts.
 *
 * A separate read rather than a filter the caller applies, because the two sets
 * answer different questions and only one of them is a superset. The archive asks
 * "has this reader been shown the answer" (lock-in), while a streak day asks "did
 * this reader finish scoring themselves against it" (submission). Deriving the
 * streak from the archive's set would quietly award a day for opening an incident.
 */
export function readCompletedAttempts(): Map<string, Attempt> {
  const completed = new Map<string, Attempt>();

  for (const [slug, attempt] of readResolvedAttempts()) {
    if (isSubmitted(attempt)) completed.set(slug, attempt);
  }

  return completed;
}

/* ------------------------------------------------------------------ *
 * Actions
 *
 * Each is read-modify-write against the stored record rather than against a
 * component's copy, so two components on the same page cannot clobber each
 * other's field.
 * ------------------------------------------------------------------ */

function update(slug: string, patch: (attempt: Attempt) => Attempt): void {
  const next = patch(readAttempt(slug));
  writeAttempt(next);
}

/** Set one pick's answer. Ignored once locked: the answer is a commitment. */
export function setPickAnswer(
  slug: string,
  pickId: string,
  optionId: string,
): void {
  update(slug, (attempt) => {
    if (isLocked(attempt)) return attempt;
    return { ...attempt, pickAnswers: { ...attempt.pickAnswers, [pickId]: optionId } };
  });
}

export function setFreeText(slug: string, text: string): void {
  update(slug, (attempt) => {
    if (isLocked(attempt)) return attempt;
    return {
      ...attempt,
      freeText: text.slice(0, FREE_TEXT_MAX),
    };
  });
}

export function lockIn(slug: string): void {
  update(slug, (attempt) => {
    if (isLocked(attempt)) return attempt;
    return { ...attempt, lockedAt: new Date().toISOString() };
  });
}

export function setRubricCheck(
  slug: string,
  itemKey: string,
  checked: boolean,
): void {
  update(slug, (attempt) => {
    // A submitted self-check is final; re-ticking would change a score that has
    // already been shown, and the streak day it earned.
    if (isSubmitted(attempt)) return attempt;
    return {
      ...attempt,
      rubricChecks: { ...attempt.rubricChecks, [itemKey]: checked },
    };
  });
}

export function submitSelfCheck(slug: string): void {
  update(slug, (attempt) => {
    if (!isLocked(attempt) || isSubmitted(attempt)) return attempt;
    return { ...attempt, submittedAt: new Date().toISOString() };
  });
}

/**
 * Discard the whole attempt for one incident — picks, prose, lock-in, rubric ticks
 * and submission together.
 *
 * One action rather than a set of per-field undos, because that is what the reader
 * means by it: the attempt is the unit, and a "clear my picks" button next to a
 * "clear my score" button would be asking them to decide which half of their own
 * answer they meant.
 *
 * The key is removed rather than overwritten with an empty attempt, so an incident
 * the reader has genuinely never opened leaves nothing behind and
 * `enumerateAttemptSlugs` cannot resurrect it into the archive. The index is
 * reconciled from an empty attempt because `syncIndex` reads the resolved state
 * off the record it is handed, and a removal is what drops the slug from it.
 *
 * Not undoable. The reader's own words are the one thing this site cannot put
 * back, which is why the control is 32px and outlined rather than sized like the
 * primary action above it (see `components/question/reset-attempt.tsx`).
 */
export function resetAttempt(slug: string): void {
  const storage = safeStorage();
  if (storage) {
    try {
      storage.removeItem(attemptKey(slug));
    } catch {
      // Storage disabled or mid-quota. The hooks re-render from the event below
      // either way, so the reset holds for the session; it just does not survive a
      // reload, which is the same bargain every other write here makes.
    }
  }
  syncIndex(slug, emptyAttempt(slug));
  notify();
}

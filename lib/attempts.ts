/**
 * Per-incident attempt storage — DESIGN.md section 8.2.
 *
 * One record per incident under `p99:attempt:<slug>`, plus a `p99:attempts:index`
 * holding the slugs that have been self-checked, so `/streak` can find completed
 * work without enumerating every key.
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
export const ATTEMPT_INDEX_KEY = "p99:attempts:index";
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
 * The completed-attempt index, rebuilt from the single record we just wrote.
 * A submission is the only transition that can add or remove a slug, so this is
 * the only place the index needs touching.
 */
function syncIndex(slug: string, attempt: Attempt): void {
  const storage = safeStorage();
  if (!storage) return;

  const current = readIndex();
  const has = current.includes(slug);
  const should = isSubmitted(attempt);

  if (has === should) return;

  const next = should
    ? [...current, slug]
    : current.filter((item) => item !== slug);

  try {
    storage.setItem(ATTEMPT_INDEX_KEY, JSON.stringify(next));
  } catch {
    /* index is an optimisation; `readCompleted` can rebuild it from the records */
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
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(ATTEMPT_INDEX_KEY, JSON.stringify(slugs));
  } catch {
    /* the records remain the source of truth; the index is only a fast path */
  }
}

/**
 * Every submitted attempt, keyed by slug.
 *
 * The index is the fast path: it names the completed slugs, so the common read is
 * a handful of `getItem` calls rather than a walk of every key in localStorage
 * (which is O(all keys on the origin), not O(our keys).
 *
 * When the index is missing entirely the records are enumerated instead and the
 * index is rebuilt, so clearing the index alone does not lose a reader's history.
 * The one case this cannot repair is a *partial* index — a slug that was
 * submitted while the index write failed, e.g. mid-quota-exhaustion. That is
 * accepted: an index write and an attempt write failing in the same breath means
 * storage is already unhealthy, and the attempt record is the durable copy.
 */
export function readCompletedAttempts(): Map<string, Attempt> {
  const completed = new Map<string, Attempt>();

  const indexed = readIndex();
  if (indexed.length === 0) {
    for (const slug of enumerateAttemptSlugs()) {
      const attempt = readAttempt(slug);
      if (isSubmitted(attempt)) completed.set(slug, attempt);
    }
    repairIndex([...completed.keys()]);
    return completed;
  }

  for (const slug of indexed) {
    const attempt = readAttempt(slug);
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

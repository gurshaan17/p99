/**
 * The broad areas an incident is filed under, in display order. Curated rather
 * than derived: `tags` are whatever an incident happens to mention, and grouping
 * by those produced a dozen one-post sections. A topic is the single shelf the
 * incident sits on.
 *
 * The literal union is the enforcement point — a typo in an incident file is a
 * type error, not a new section.
 */
export const TOPICS = [
  {
    id: "caching",
    label: "Caching",
    description: "Expiry, stampedes, and what the cache was doing while it lied.",
  },
  {
    id: "databases",
    label: "Databases",
    description: "Storage engines holding state: bloat, locks, pool saturation.",
  },
  {
    id: "runtime",
    label: "Runtime",
    description: "The process itself: memory, GC, and the pauses inside it.",
  },
  {
    id: "platform",
    label: "Platform",
    description: "Orchestration, probes, and the failure of a control plane.",
  },
] as const;

export type Topic = (typeof TOPICS)[number]["id"];

export interface Incident {
  slug: string;
  title: string;
  publishedAt: string; // ISO date
  difficulty: "easy" | "medium" | "hard";
  /** The one broad area this incident is filed under. Sections group by this. */
  topic: Topic;
  /** Fine-grained. Filtering and badges only — never a section. */
  tags: string[];
  symptom: string;
  constraints: string[];
  evidence: string[];
  question: string;
  picks: {
    id: string;
    prompt: string;
    options: { id: string; label: string }[];
    answer: string; // must match an option id
  }[];
  diagnosis: string; // markdown-formatted string, multi-paragraph ok
  fix: string; // markdown-formatted string
  rubric: { text: string; dim: "process" | "correctness" | "depth" }[];
  /**
   * The three things worth carrying out of the incident — the compressed lesson,
   * after the specific one.
   *
   * Separate from `rubric` on purpose. The rubric scores whether *this* reader's
   * answer covered the mechanism, and is checked by the reader against their own
   * reasoning. These are the statements that are true whether or not anybody
   * reasoned well, so there is nothing to self-score about them — they are what
   * the incident was for, not a judgement on the reader.
   */
  remember: string[];
}

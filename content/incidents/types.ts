export interface Incident {
  slug: string;
  title: string;
  publishedAt: string; // ISO date
  difficulty: "easy" | "medium" | "hard";
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
}

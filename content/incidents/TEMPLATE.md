// Template for a new incident — copy it, don't edit it in place:
//
//   cp content/incidents/TEMPLATE.md content/incidents/018-your-slug.ts
//
// Then rename the export, the `slug`, and rewrite every field. Keep the `.ts`
// extension: the incidents are TypeScript objects, not MDX, so the schema is
// enforced by `tsc` and a field of the wrong shape is a build error rather than
// a broken page.
//
// These comments are deliberately `//` rather than HTML, so that a copy of
// this file is valid TypeScript the moment it is renamed. Delete them as you
// go — a finished incident has none of them.
//
// The content model section of the README explains what each field is for.

import type { Incident } from "./types";

export const yourSlug = {
  // URL segment: /q/<slug>. Must match the file name, lowercase-kebab-case.
  slug: "your-slug",

  // One sentence describing the failure, not the fix. The reader should already
  // feel the shape of the problem from this line alone.
  title: "What broke, in one sentence, without giving away the cause.",

  // ISO date. An incident dated in the future stays hidden until that date, so
  // this doubles as a scheduling mechanism — but to publish now, use today or
  // earlier.
  publishedAt: "2026-01-01",

  difficulty: "medium",

  // Exactly one, from the curated list in ./types.ts. A misspelling here is a
  // type error. Choose the area the failure lives in, not the technology that
  // happens to be involved.
  topic: "caching",

  // Fine-grained, lowercase, free-form. These become filter chips, not sections.
  // Prefer reusing a tag an existing incident already uses.
  tags: ["redis", "concurrency"],

  // The situation the reader is dropped into: what the system does, at what
  // scale, and what is wrong from the outside. Prose, not a bullet list. Name
  // no company and no real customer.
  symptom:
    "What the system does, how big it is, and what an operator would see going wrong.",

  // What the fix is not allowed to violate — budgets, latency targets, no
  // dropping data, no restarts. These carry the real difficulty: they are what
  // turn a question with an obvious answer into one worth reading. Every number
  // should be load bearing; if deleting a constraint makes the question easier,
  // it is decoration.
  constraints: [
    "A hard numeric budget, in the units that matter — latency, memory, throughput",
    "A correctness requirement the fix must not break",
    "An operational constraint: no downtime, no data loss, no coordinated deploy",
  ],

  // The telemetry the reader reasons from. Each entry should be a clue that is
  // true, that is observable, and that narrows the field.
  //
  // The rule that makes this work: the `picks` must be answerable *from these
  // alone*. If a reader could reach the right answer while ignoring the
  // evidence, the question is broken — they guessed, and the reveal teaches
  // nothing.
  evidence: [
    "A measurement that looks locally plausible but is wrong globally",
    "A correlation that rules out the obvious suspect",
    "Something that only appears under concurrency, or only at scale",
  ],

  // What the reader is being asked to solve, in one sentence.
  question: "What exactly are they being asked to figure out?",

  // Multiple-choice diagnoses, answered in order. Each option is an id and a
  // label written the way the reader would say it out loud.
  picks: [
    {
      // Stable id for this pick, kebab-case. Used in URLs and answer storage.
      id: "where-does-state-live",
      prompt: "A question the reader answers by choosing one of these.",
      options: [
        {
          id: "some-correct-answer",
          label: "The right answer, in the words a competent engineer would use.",
        },
        {
          // Distractors must be defensible: the answer someone gives before
          // they know the detail the evidence reveals. A wrong option that is
          // obviously wrong teaches nothing and only pads the list.
          id: "plausible-wrong-answer",
          label: "The tempting answer that the evidence rules out.",
        },
      ],
      // Must exactly match one option id above.
      //
      // Note: nothing enforces this at build time. `answer` is typed as a plain
      // string, so tsc cannot tell which of your option ids it is meant to be —
      // a typo here compiles cleanly and then reveals as a question with no
      // correct answer. Check it by eye; CI will not.
      answer: "some-correct-answer",
    },
  ],

  // What was actually wrong. Markdown, multi-paragraph, and it should not read
  // as a summary of the correct pick — the reader has already chosen it. This
  // is where the mechanism gets explained: the sequence of events, in order,
  // that turned a normal day into an outage.
  diagnosis: `
What actually went wrong, in enough detail that a reader could recognise it in
their own system. Markdown, and multiple paragraphs are welcome.`,

  // What actually fixed it, including what was tried first and why it was not
  // enough. If the honest answer is "this is not fixable, here is how you
  // degrade", write that instead of a fix that does not exist.
  fix: `What actually fixed it, and what was tried first that was not enough.`,

  // How a reader scores their own answer against the reveal. Self-checked, so
  // write it as criteria, not as a verdict.
  //
  // - process: did they reason from evidence rather than pattern-match?
  // - correctness: does their diagnosis match the mechanism?
  // - depth: did they reach the consequences, or stop at the first cause?
  rubric: [
    { text: "What a process-satisfactory answer did.", dim: "process" },
    { text: "What a correct answer got right about the mechanism.", dim: "correctness" },
    { text: "The consequence a shallow answer stops short of.", dim: "depth" },
  ],

  // The three things worth carrying out of this incident — the compressed
  // lesson, stated so it holds beyond this specific story. These are true
  // whether or not anybody reasoned well, which is why they are separate from
  // `rubric`: there is nothing here for the reader to self-score.
  remember: [
    "The transferable rule, in one sentence.",
    "The second rule, and the condition under which it does not hold.",
    "The one to remember when this happens to you at 3am.",
  ],
} satisfies Incident;

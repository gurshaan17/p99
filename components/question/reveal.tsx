"use client";

import { useState } from "react";
import type { Question } from "@/lib/questions";
import { PrimaryButton } from "@/components/ui/button";
import { Diagnosis, Fix, Remember } from "@/components/question/incident";

/**
 * Reveal the answer — DESIGN.md section 8.1.
 *
 * The diagnosis is the payload of the day, so it is withheld until asked for.
 * The prompt stays on screen above it: reading the answer without first reading
 * the question is the one thing this site exists to prevent.
 *
 * Client-side on purpose. The answer is already in the page payload either way,
 * so this is a pacing device, not a paywall.
 */
export function Reveal({ question: q }: { question: Question }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <PrimaryButton onClick={() => setOpen(true)}>
          Reveal the diagnosis
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="reveal flex flex-col gap-6">
      <Diagnosis text={q.diagnosis} />
      <Fix text={q.fix} />
      <div className="flex flex-col gap-2">
        <h2 className="flex items-baseline gap-2.5 font-mono text-micro tracking-wider text-ink-3 uppercase">
          <span className="tabular-nums">05</span>
          Takeaways
        </h2>
        <Remember items={q.remember} />
      </div>
    </div>
  );
}

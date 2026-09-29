"use client";

import { useState } from "react";
import type { Incident } from "@/lib/incidents";
import { PrimaryButton } from "@/components/ui/button";
import { Diagnosis, Fix, Remember, Section } from "@/components/question/incident";
import { Rubric } from "@/components/question/rubric";

/**
 * Reveal the answer — DESIGN.md section 8.1.
 *
 * The diagnosis is the payload of the day, so it is withheld until asked for.
 * The question and the picks stay on screen above it: reading the answer without
 * first committing to one is the one thing this site exists to prevent.
 *
 * Client-side on purpose. The answer is already in the page payload either way,
 * so this is a pacing device, not a paywall.
 */
export function Reveal({ incident }: { incident: Incident }) {
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
    <div className="reveal flex flex-col gap-8">
      <Diagnosis text={incident.diagnosis} />
      <Fix text={incident.fix} />
      <Section index="06" label="Rubric">
        <Rubric rubric={incident.rubric} />
      </Section>
      {/*
        `Remember` takes its own index rather than inheriting `06` — this is the
        home page's standalone run (04, 05, 06) and the article's continues past
        the self-score, so the two renderers pass different numbers and the
        component defaults to neither.
      */}
      <Remember items={incident.remember} index="07" />
    </div>
  );
}

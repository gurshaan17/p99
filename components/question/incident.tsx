import type { Incident } from "@/lib/incidents";
import { Markdown } from "./markdown";

/**
 * Incident body — DESIGN.md sections 7.10, 8.2, 9.
 *
 * Faint, quiet presentation for long prose; the question is the only thing on the
 * page allowed to lead.
 *
 * `constraints` and `evidence` are plain prose strings in this schema, not
 * key/value pairs and not code, so both render as indexed lists rather than the
 * spec table and labelled code panels the previous shape called for. Section 9's
 * `.prose-site` styles cover the markdown bodies.
 */

export function Symptom({ incident }: { incident: Incident }) {
  return (
    <Section index="01" label="Symptom">
      <p className="text-body text-ink-2 text-pretty">{incident.symptom}</p>
    </Section>
  );
}

export function Constraints({ items }: { items: string[] }) {
  return (
    <Section index="02" label="Constraints">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item}
            className="border-b border-dashed border-line py-row text-body text-ink-2 text-pretty last:border-0"
          >
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Evidence({ items }: { items: string[] }) {
  return (
    <Section index="03" label="Evidence">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-baseline gap-item border-b border-dashed border-line py-row text-body text-ink-2 text-pretty last:border-0"
          >
            {/*
              `items-baseline` on the row aligns the arrow to the first line's
              baseline. With the default `stretch` the arrow inherited its own
              13px/1.5 line box inside a 24.75px body line box, which left it
              sitting roughly 3px high against the text it labels.
            */}
            <span aria-hidden className="font-mono text-small text-ink-3">
              →
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** The one thing allowed to lead — the question being asked. */
export function Question({ text }: { text: string }) {
  return (
    <p className="font-display text-lead font-medium text-ink text-balance">
      {text}
    </p>
  );
}

/**
 * The index defaults to the standalone sequence (04, 05) used by the homepage's
 * `Reveal`, which renders diagnosis and fix with nothing numbered above them. The
 * incident page inserts a prediction form between its question and the solution,
 * so it passes its own numbers rather than leaving a gap in the run.
 */
export function Diagnosis({ text, index = "04" }: { text: string; index?: string }) {
  return (
    <Section index={index} label="Diagnosis">
      <Markdown>{text}</Markdown>
    </Section>
  );
}

export function Fix({ text, index = "05" }: { text: string; index?: string }) {
  return (
    <Section index={index} label="Fix">
      <Markdown>{text}</Markdown>
    </Section>
  );
}

/**
 * The things to remember — DESIGN.md section 8.2.
 *
 * A closing list, numbered, after the fix. It repeats nothing the fix says; the
 * fix is what to do about *this* incident and these are what generalises past it.
 * A reader who has the fix open on a screen six months from now will not have this
 * list, and that is the point — the fix is the thing that rots.
 *
 * The label does not count them. It used to say "three", which was true when every
 * incident carried three and stopped being true the first one carried five — a
 * heading that asserts a number the list does not have to honour is a small lie
 * that only the content can catch.
 *
 * Presentational and ungated. The gate is the caller's, because the two callers
 * disagree: `Reveal` on the home page is already behind its own button, and the
 * article has to put this behind the attempt. These are lessons, and a lesson that
 * gives away its own incident has not earned the name.
 */
export function Remember({ items, index }: { items: string[]; index?: string }) {
  if (items.length === 0) return null;

  return (
    <Section index={index ?? "08"} label="Things to remember">
      <ol className="flex flex-col">
        {items.map((item, i) => (
          <li
            key={item}
            className="flex gap-item border-b border-dashed border-line py-row text-body text-ink-2 text-pretty last:border-0"
          >
            <span aria-hidden className="font-mono text-small text-ink-3 tabular-nums">
              {i + 1}.
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Section wrapper: mono index + uppercase label, used by every block above. */
export function Section({
  index,
  label,
  children,
}: {
  index: string;
  label: string;
  children: React.ReactNode;
}) {
  // Ids must not contain whitespace, so "The question" cannot pass through
  // lowercasing alone — the sidebar and topics page link to these by fragment.
  const id = `h-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <h2
        id={id}
        className="mb-item flex items-baseline gap-item font-mono text-micro tracking-wider text-ink-3 uppercase"
      >
        <span className="tabular-nums">{index}</span>
        {label}
      </h2>
      {children}
    </section>
  );
}

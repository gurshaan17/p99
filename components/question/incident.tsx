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
            className="border-b border-dashed border-line py-2.5 text-body text-ink-2 text-pretty last:border-0"
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
            className="flex gap-2.5 border-b border-dashed border-line py-2.5 text-body text-ink-2 text-pretty last:border-0"
          >
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

export function Diagnosis({ text }: { text: string }) {
  return (
    <Section index="04" label="Diagnosis">
      <Markdown>{text}</Markdown>
    </Section>
  );
}

export function Fix({ text }: { text: string }) {
  return (
    <Section index="05" label="Fix">
      <Markdown>{text}</Markdown>
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
        className="mb-2 flex items-baseline gap-2.5 font-mono text-micro tracking-wider text-ink-3 uppercase"
      >
        <span className="tabular-nums">{index}</span>
        {label}
      </h2>
      {children}
    </section>
  );
}

import type { Evidence, Question } from "@/lib/questions";

/**
 * Incident body — DESIGN.md section 7.10.
 *
 * Faint, quiet presentation for long prose; the prompt is the only thing on the
 * page allowed to lead. Evidence blocks get a mono filename or language label
 * flush right in the top-right corner (section 9), and code never wraps.
 */
export function Symptom({ question: q }: { question: Question }) {
  return (
    <section aria-labelledby="h-symptom">
      <Eyebrow id="h-symptom" index="01" label="Symptom" />
      <p className="text-body text-ink-2 text-pretty">{q.symptom}</p>
    </section>
  );
}

/** Key/value constraint grid — reads as a spec table, not a chart. */
export function Constraints({ constraints }: { constraints: Question["constraints"] }) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-2">
      {constraints.map((c) => (
        <div key={c.key} className="bg-page px-3 py-2">
          <dt className="font-mono text-micro tracking-wider text-ink-3 uppercase">
            {c.key}
          </dt>
          <dd className="mt-0.5 text-body text-ink tabular-nums">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EvidenceBlocks({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="flex flex-col gap-3">
      {evidence.map((e, i) => (
        <figure
          key={i}
          className="relative overflow-hidden rounded-control border border-line bg-surface"
        >
          <figcaption className="absolute top-2 right-3 font-mono text-micro tracking-wider text-ink-3 uppercase select-none">
            {"language" in e ? e.language : e.label}
          </figcaption>
          <pre className="overflow-x-auto p-3 pt-8 font-mono text-small leading-relaxed text-ink-2">
            <code>{e.body}</code>
          </pre>
        </figure>
      ))}
    </div>
  );
}

/** The one thing allowed to lead — the question being asked. */
export function Prompt({ text }: { text: string }) {
  return (
    <p className="font-display text-lead font-medium text-ink text-pretty">
      {text}
    </p>
  );
}

export function Diagnosis({ text }: { text: string }) {
  return (
    <section aria-labelledby="h-diagnosis">
      <Eyebrow id="h-diagnosis" index="03" label="Diagnosis" />
      <p className="text-body text-ink-2 text-pretty">{text}</p>
    </section>
  );
}

export function Fix({ text }: { text: string }) {
  return (
    <section aria-labelledby="h-fix">
      <Eyebrow id="h-fix" index="04" label="Fix" />
      <p className="text-body text-ink-2 text-pretty">{text}</p>
    </section>
  );
}

/** Faint, hairline-separated takeaways (section 7.10). */
export function Remember({ items }: { items: string[] }) {
  return (
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
  );
}

function Eyebrow({
  id,
  index,
  label,
}: {
  id: string;
  index: string;
  label: string;
}) {
  return (
    <h2
      id={id}
      className="mb-2 flex items-baseline gap-2.5 font-mono text-micro tracking-wider text-ink-3 uppercase"
    >
      <span className="tabular-nums">{index}</span>
      {label}
    </h2>
  );
}

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SubscribeForm } from "@/components/about/subscribe-form";
import type { Metadata } from "next";
import { recentIncidents, todaysIncident, topicMeta } from "@/lib/incidents";
import { ALTERNATE_TYPES, OPEN_GRAPH } from "@/lib/metadata";
import { ListRow } from "@/components/archive/list-row";
import { SectionHeader } from "@/components/archive/section-header";
import { GhostLink } from "@/components/ui/button";
import { Constraints, Evidence, Symptom } from "@/components/question/incident";
import { Reveal } from "@/components/question/reveal";

/**
 * Only a canonical and an `og:url`, both `/`.
 *
 * The title and description are inherited from the layout, and the other three
 * routes set their own canonical. Declaring them here rather than in the layout
 * is the point: a layout-level canonical or `og:url` is inherited by every route
 * underneath it, so a single `"/"` in `layout.tsx` would tell every crawler that
 * `/topics`, `/streak` and `/archive` are duplicates of the home page.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/", types: ALTERNATE_TYPES },
  openGraph: { ...OPEN_GRAPH, url: "/" },
};

/**
 * ISR rather than a build-time snapshot — DESIGN.md section 8.6.
 *
 * The cron at `PUBLISH_CRON` revalidates the layout this page sits under, so
 * the day's post appears without a deploy. This is the net: if the cron is late,
 * missed or throttled, the page still turns over within the hour. A literal,
 * because Next statically analyses the value.
 */
export const revalidate = 3600;

export default function TodayPage() {
  const incident = todaysIncident;
  const recent = recentIncidents(4);

  return (
    <div className="flex flex-col gap-section">
      <aside aria-label="How p99 works" className="flex flex-col gap-item rounded-card bg-accent-tint/40 px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="font-mono text-micro tracking-wider text-accent-ink uppercase">
          A daily exercise in production debugging
        </p>
        <p className="text-body text-ink-2 text-pretty">
          You’re on call. Read the symptoms, follow the evidence, and make your
          diagnosis before opening the solution.
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-micro text-ink-3">
          <span>01 Read the case</span><span aria-hidden>→</span>
          <span>02 Make a call</span><span aria-hidden>→</span>
          <span>03 Compare your reasoning</span>
        </p>
      </aside>

      <header className="flex flex-col gap-block">
        <div className="flex flex-wrap items-center justify-between gap-item font-mono text-micro tracking-wider text-ink-3 uppercase">
          <span className="text-accent-ink">Today’s incident</span>
          <time dateTime={incident.publishedAt}>{incident.publishedAt}</time>
        </div>
        <h1 className="font-display text-title font-medium tracking-tight text-ink text-balance">
          {incident.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-ink-3">
          <span className="font-mono text-micro uppercase">{topicMeta(incident.topic).label}</span>
          <span className="rounded-chip bg-field px-2 py-1 font-mono text-micro uppercase">{incident.difficulty}</span>
          <span className="min-w-0 text-pretty">{incident.tags.join(" / ")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={`/q/${incident.slug}`} className="inline-flex min-h-10 items-center justify-center gap-item rounded-control bg-ink px-4 py-2 text-body font-medium text-page transition-colors duration-(--dur-hover) hover:bg-ink-2 active:scale-(--press)">
            Diagnose this incident <ArrowUpRight aria-hidden className="size-4" strokeWidth={1.5} />
          </Link>
          <span className="text-small text-ink-3">Make your prediction. Then reveal the fix.</span>
        </div>
      </header>

      <div className="-mx-(--pad-x) border-t border-dashed border-line px-(--pad-x) pt-(--pad-y)">
        <Symptom incident={incident} />
      </div>
      <Constraints items={incident.constraints} />
      <Evidence items={incident.evidence} />

      <section aria-labelledby="h-your-call" className="flex flex-col gap-item border-l-2 border-accent-ink pl-4">
        <h2 id="h-your-call" className="font-mono text-micro tracking-wider text-accent-ink uppercase">Your call</h2>
        <p className="font-display text-lead font-medium text-ink text-pretty">{incident.question}</p>
        <GhostLink className="w-fit" href={`/q/${incident.slug}`}>Write down your diagnosis →</GhostLink>
      </section>

      <Reveal incident={incident} />

      {recent.length > 0 ? (
        <section aria-label="Recent incidents" className="-mx-(--pad-x) flex flex-col gap-block border-t border-dashed border-line px-(--pad-x) pt-(--pad-y)">
          <SectionHeader
            index="02"
            title="Recent"
            description="Previously diagnosed."
          />
          <ul className="list-rows flex flex-col">
            {recent.map((r) => (
              <ListRow key={r.slug} incident={r} />
            ))}
          </ul>
          <div>
            <GhostLink href="/archive">Browse the archive</GhostLink>
          </div>
        </section>
      ) : null}
      <section aria-labelledby="h-newsletter" className="-mx-(--pad-x) flex flex-col gap-block border-t border-dashed border-line px-(--pad-x) pt-(--pad-y)">
        <div className="flex flex-col gap-item">
          <p className="font-mono text-micro tracking-wider text-accent-ink uppercase">The next incident, in your inbox</p>
          <h2 id="h-newsletter" className="font-display text-lead font-medium text-ink">Keep your debugging instincts sharp.</h2>
          <p className="text-body text-ink-3">One production incident a day. Symptoms, evidence, and a diagnosis to work through.</p>
        </div>
        <SubscribeForm />
      </section>
    </div>
  );
}

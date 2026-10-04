import type { Metadata } from "next";
import { site } from "@/lib/site";
import { ALTERNATE_TYPES, OPEN_GRAPH } from "@/lib/metadata";
import { SectionHeader } from "@/components/archive/section-header";

export const metadata: Metadata = {
  title: "Submit",
  description: "How to submit an incident to p99.",
  alternates: { canonical: "/submit", types: ALTERNATE_TYPES },
  openGraph: { ...OPEN_GRAPH, url: "/submit" },
};

const CONTRIBUTING_URL = `${site.repo}#contributing-an-incident`;

/**
 * Submit — DESIGN.md section 8.5 pattern, same page rhythm as /about.
 *
 * The details live in the README because that is what GitHub renders; this
 * page is the short version for someone who arrived from the site, ending in
 * the one outbound link to the full contribution guide.
 */
export default function SubmitPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Submit an incident"
        description="A real failure mode from a real system, not a topic."
      />

      <div className="prose-site flex flex-col">
        <p>
          p99 is an archive of production incidents, and contributions are
          welcome. The fastest route is a pull request — you do not need to
          touch any application code, just one new file plus one line in the
          registry.
        </p>
        <ol>
          <li>Fork the repo and branch off <code>main</code>.</li>
          <li>
            Copy <code>content/incidents/TEMPLATE.md</code> to a new file named{" "}
            <code>NNN-your-slug.ts</code> — every field is commented.
          </li>
          <li>
            Fill in the symptom, constraints, evidence, question, picks,
            diagnosis, fix, rubric and the three compressed lessons.
          </li>
          <li>
            Register the new file in <code>content/incidents/index.ts</code>.
          </li>
          <li>
            Run <code>npm run lint</code> and <code>npm run build</code>, then
            open the PR.
          </li>
        </ol>
        <p>
          One incident per PR, do not edit other incidents in the same PR, and
          check that your <code>answer</code> id matches one of its option ids
          — the build will not catch that one.
        </p>
      </div>

      <section
        aria-labelledby="h-submit"
        className="flex flex-col gap-3 border-t border-dashed border-line pt-6"
      >
        <SectionHeader
          title="Contributing guide"
          description="The full walkthrough, guidelines and CI details."
        />
        <p>
          <a
            href={CONTRIBUTING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-body font-medium text-page no-underline transition-colors hover:bg-ink-2"
          >
            Read the contributing guide on GitHub&nbsp;&rarr;
          </a>
        </p>
      </section>
    </div>
  );
}

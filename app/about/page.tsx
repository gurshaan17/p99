import type { Metadata } from "next";
import { CONTACT_EMAIL, site } from "@/lib/site";
import { SectionHeader } from "@/components/archive/section-header";
import { MailtoSignup } from "@/components/about/mailto-signup";

export const metadata: Metadata = {
  title: "About — p99",
  description: site.tagline,
};

/**
 * About — DESIGN.md section 8.5.
 *
 * Also the destination for the topbar's Subscribe and Suggest controls, and the
 * sidebar footer's Newsletter and Info links. Those controls are real links
 * because those sections actually exist.
 */
export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader index="01" title="About" description={site.tagline} />

      <div className="prose-site flex flex-col">
        <p>
          Most engineering writing is about building things. This is about the
          moment something built breaks in production, and about the habit of
          reading a system&rsquo;s behaviour before reaching for a fix.
        </p>
        <p>
          Each incident is presented the way it actually happens: a symptom, the
          constraints that narrow it, the evidence, and then the question. The
          diagnosis is withheld until you ask for it, because the part worth
          practising is the part before the answer.
        </p>
        <p>
          Nothing here is a puzzle with a hidden trick. Every incident is
          something that genuinely happens, and every fix is one that has
          genuinely worked.
        </p>
      </div>

      <section
        id="newsletter"
        aria-labelledby="h-newsletter"
        className="flex scroll-mt-16 flex-col gap-3 border-t border-dashed border-line pt-6"
      >
        <SectionHeader
          index="02"
          title="Newsletter"
          description="One incident a day, nothing else."
        />
        {CONTACT_EMAIL ? (
          <MailtoSignup
            to={CONTACT_EMAIL}
            cta="Subscribe"
            placeholder="you@example.com"
            subject="Subscribe to p99"
            body={(email) => `Please add ${email} to the p99 newsletter.`}
          />
        ) : (
          <p className="text-body text-ink-3">
            The list is not open yet.{" "}
            <a
              href={site.repo}
              className="text-accent-ink underline-offset-4 hover:underline"
            >
              Watch the repository
            </a>{" "}
            to hear when it opens.
          </p>
        )}
      </section>

      <section
        id="suggest"
        aria-labelledby="h-suggest"
        className="flex scroll-mt-16 flex-col gap-3 border-t border-dashed border-line pt-6"
      >
        <SectionHeader
          index="03"
          title="Suggest a topic"
          description="An incident you lived through beats one you think you remember."
        />
        {CONTACT_EMAIL ? (
          <MailtoSignup
            to={CONTACT_EMAIL}
            cta="Send"
            placeholder="The incident"
            subject="Topic suggestion for p99"
            body={(topic) => `Incident I would suggest:\n\n${topic}`}
          />
        ) : (
          <p className="text-body text-ink-3">
            Open an issue on{" "}
            <a
              href={`${site.repo}/issues`}
              className="text-accent-ink underline-offset-4 hover:underline"
            >
              GitHub
            </a>{" "}
            and it will be picked up.
          </p>
        )}
      </section>
    </div>
  );
}

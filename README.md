# p99

**One production incident a day. Diagnose the system, not the algorithm.**

[p99.online](https://p99.online) is an archive of real production incidents —
the cache stampede, the connection-pool starvation, the read-modify-write race
on a counter. Each one presents a broken system with its symptom, its
constraints and its telemetry, makes you pick a diagnosis, and only then reveals
what actually happened and how it was fixed.

The through-line is not algorithmic puzzles. It is the class of bug that only
appears when code meets a distributed, concurrent, real system — and the
reasoning needed to find it.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) · [React](https://react.dev) 19 · [TypeScript](https://www.typescriptlang.org) 5
- [Tailwind CSS](https://tailwindcss.com) v4
- [next-themes](https://github.com/pacocoursey/next-themes) (light/dark, follows system by default)
- [cmdk](https://cmdk.paco.me) (command palette) · [Radix UI](https://www.radix-ui.com) · [lucide-react](https://lucide.dev)
- [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) (diagnosis prose)
- [Upstash Redis](https://upstash.com) + [@upstash/ratelimit](https://upstash.com/docs/redis/features/ratelimit) (submission rate limiting)
- [AWS SES](https://aws.amazon.com/ses/) (welcome email + daily digest)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- Deployed on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | for `/api/subscribe` | Redis endpoint backing the rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | for `/api/subscribe` | Redis token |
| `CRON_SECRET` | in production | Bearer token Vercel's cron sends to `/api/revalidate` |
| `AWS_REGION` | for sending | SES region |
| `AWS_ACCESS_KEY_ID` | for sending | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | for sending | AWS secret key |
| `SES_FROM_EMAIL` | for sending | Verified sender address |
| `SNS_WEBHOOK_SECRET` | for the SNS webhook | Shared secret the SNS webhook endpoint checks |
| `UNSUBSCRIBE_SECRET` | for sending | HMAC key signing unsubscribe links |
| `VERCEL_PROJECT_PRODUCTION_URL` | auto on Vercel | Canonical origin (canonical URLs, RSS, OG tags) |
| `VERCEL_URL` | auto on Vercel | Fallback origin, overridden by the above |
| `VERCEL_ACCESS_TOKEN` | for the sidebar visitor count | Bearer token for the Web Analytics API |
| `VERCEL_PROJECT_ID` | for the sidebar visitor count | Vercel project receiving the analytics events |
| `VERCEL_TEAM_ID` / `VERCEL_TEAM_SLUG` | team projects only | Team context for the Web Analytics API |

`lib/origin.ts` is the single place the site's host is resolved — Vercel vars
win, with `https://p99.online` as the local-dev fallback. Nothing else should
hardcode a host.

Without the Redis vars the subscribe and prediction endpoints still build; they
simply stop rate limiting rather than 500-ing. See `lib/redis.ts`.

## Newsletter

Subscribing at `/about` writes the address to the `p99:subscribers` Redis set
(idempotent `SADD`, so re-subscribing changes nothing) and sends a welcome
email. A Vercel cron (`vercel.json`: `0 4 * * *` — 04:00 UTC, 09:30 IST) sends
the daily digest via `/api/cron/daily-digest`. Sends are raw MIME from
`lib/email/send.ts` because Gmail/Yahoo require `List-Unsubscribe` and
`List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers:

- `/api/unsubscribe` verifies an HMAC token (`lib/unsubscribe.ts`, keyed by
  `UNSUBSCRIBE_SECRET`) and `SREM`s the address — GET for the browser, POST
  for one-click.
- `/api/ses-notifications` consumes SNS: hard bounces and complaints are
  removed from the list automatically.
- `scripts/preview-emails.ts` renders both templates to `.preview/` without
  sending.

Without the AWS vars the site still builds; subscribing just stores the address
and skips the welcome send.

## Project layout

```text
app/                  routes — /, /archive, /topics, /q/[slug], /streak, /about,
                      /submit, plus /rss.xml, /llms.txt, /api/revalidate,
                      /api/subscribe, /api/unsubscribe, /api/ses-notifications,
                      /api/cron/daily-digest
components/
  shell/              frame, sidebar, topbar, mobile nav, search, command palette
  question/           the incident reader: picks, reveal, rubric, remember-gate
  archive/            archive grid/list, filters, streak record
  about/              subscribe + mailto signup forms
  ui/                 button, control, badge, keycap, nav-item
content/incidents/    ← one file per incident, this is where content lives
  TEMPLATE.md         copy this to start an incident
  types.ts            the Incident schema + curated TOPICS list
  index.ts            the registry: imports every incident, newest first
lib/                  incidents (queries), site config, origin, redis, metadata, nav
lib/email/            welcome email, daily digest, frame, raw-MIME send (List-Unsubscribe)
lib/seo/              the SEO core — pages, metadata, schema, canonical,
                      breadcrumbs, related, eligibility, sitemap
scripts/              seo-validate.ts (npm run seo:validate), preview-emails.ts
docs/                 seo.md (SEO architecture), seo-audit.md (phase-27 audit)
hooks/                useAttempt (in-memory answer state), useResolvedSlugs
DESIGN.md             design system — tokens, typography, layout, components
AGENTS.md             rules for coding agents working in this repo
```

CI also runs `npm run seo:validate` and `npm test` (vitest) alongside the
type check and build. See `docs/seo.md` for how the SEO core fits together.

## Content model

Incidents are **TypeScript files, not MDX**, so the schema is enforced by
`tsc`: a malformed incident fails the build rather than rendering broken.

```text
content/incidents/017-rate-limiter-shared-state-redis.ts
```

- File name is `NNN-kebab-case-slug.ts` — the number is historical, it does not
  need to match publish order.
- One export, named in camelCase (`rateLimiterSharedStateRedis`).
- The `slug` field must match the file name.
- Add the import and the entry to `incidents[]` in `content/incidents/index.ts`.
  It is sorted by `publishedAt`, newest first.

The `Incident` interface is in `content/incidents/types.ts`:

| Field | What it is |
| --- | --- |
| `slug` | URL segment, `/q/<slug>` |
| `title` | One sentence describing the failure, not the fix |
| `publishedAt` | ISO date; **an incident dated in the future stays hidden until 02:00 IST on that date** |
| `difficulty` | `easy` \| `medium` \| `hard` |
| `topic` | Exactly one of `caching` \| `databases` \| `runtime` \| `platform` |
| `tags` | Fine-grained; used for filtering and badges, never as a section |
| `symptom` | The situation the reader is dropped into, in prose |
| `constraints[]` | What the fix is not allowed to violate — the real difficulty |
| `evidence[]` | The telemetry clues; `picks` are answerable from these |
| `question` | What the reader is being asked to solve |
| `picks[]` | Multiple-choice diagnoses, each with `options[]` and an `answer` id that must match one of those option ids — **check this by eye, nothing enforces it** |
| `diagnosis` | Markdown, multi-paragraph. What was actually wrong |
| `fix` | Markdown. What actually fixed it |
| `rubric[]` | How to score *this reader's* answer: `process` \| `correctness` \| `depth` |
| `remember[]` | The 3 compressed lessons, true regardless of how anyone reasoned |

`rubric` and `remember` are deliberately separate: the rubric scores a person's
answer and is self-checked, while `remember` is the compressed lesson and has
nothing to self-score.

### Scheduled publishing

An incident dated in the future is not live yet, and it stays invisible until
**02:00 IST** on its `publishedAt` day — 20:30 UTC the evening before, because IST
is UTC+05:30. The instant lives in one place, `publishDayKey` in
`lib/incidents.ts`, and everything else derives from it.

Three things make that work:

- **Filtering.** Every rendering surface reads `publishedIncidents()`, and
  `getIncident` returns nothing for an unpublished slug — so a scheduled incident
  is absent from the home page, the archive, `/topics`, the sidebar counts, the
  tag chips, the command palette, `/rss.xml`, `/llms.txt`, and `/q/<slug>` 404s
  with no metadata. `DESIGN.md` section 8.6 has the reasoning; the rule is that no
  surface may read the raw registry.
- **ISR.** `/`, `/archive`, `/topics`, `/streak` and `/q/[slug]` set
  `revalidate = 3600`. That is the net: a missed revalidation costs an hour.
- **The cron.** `vercel.json` calls `/api/revalidate` at `30 20 * * *` — 20:30
  UTC, which is 02:00 IST — marking the root layout stale so each page re-renders
  against the new clock. Vercel sends `Authorization: Bearer $CRON_SECRET`;
  without that variable set the endpoint only answers requests carrying
  `VERCEL=1`, which is Vercel's own infrastructure. A second cron,
  `/api/cron/daily-digest`, fires at `0 4 * * *` (04:00 UTC, 09:30 IST) to send
  the newsletter.

Changing the publish time means editing `PUBLISH_LOCAL_MINUTE_OF_DAY` and the
schedule in `vercel.json` together — Vercel reads that file before any of this
code runs, so nothing can check they agree. `PUBLISH_CRON` in `lib/incidents.ts`
carries the same string for the response body and the docs.

A slug dated tomorrow is not in the build's `generateStaticParams` list, which is
why `dynamicParams` stays at its default: the route renders on demand once the
instant passes, and `getIncident` decides whether that render is the article or a
404.

### Writing an incident

- **Start from a real failure mode**, not a topic. "Postgres autovacuum never ran
  because someone held a long transaction open" beats "a database question".
- **The evidence must actually determine the answer.** If a reader could pick the
  right option while ignoring the evidence, the question is broken.
- **Distractors must be defensible.** A wrong option should be the answer a
  competent engineer gives before learning the detail — not an obviously silly one.
- **The constraints are the puzzle.** Numbers in `constraints` should be load
  bearing; deleting them should make the question easier.
- **No company names, no real customer data.** Invent systems and incidents.
- **The fix must be the real fix**, not a workaround dressed up. If the honest
  answer is "this is not fixable, here is how you degrade", say that.

## Contributing an incident

The fastest route is a pull request. You do not need to touch any application
code — a single new file plus one line in the registry is the whole change.

1. **Fork and branch** off `main`.

   ```bash
   git checkout -b incident-your-slug
   ```

2. **Copy the template**, which has every field with a comment explaining what
   belongs in it:

   ```bash
   cp content/incidents/TEMPLATE.md content/incidents/018-your-slug.ts
   ```

   Copying the closest existing incident instead is also fine — it gets the
   prose rhythm right where the template only gets the schema right.

3. **Fill in every field** per the table above. Set `publishedAt` to today or
   earlier — a future date hides the incident until it arrives, which is a
   legitimate way to schedule a post but not what you want by accident.

4. **Register it** in `content/incidents/index.ts`:

   ```ts
   import { yourSlug } from "./018-your-slug";
   // ...
   export const incidents: Incident[] = [
     // ...existing
     yourSlug,
   ]
   ```

   The export name and the `slug` field must both match the file name, or the
   build fails.

5. **Verify before opening the PR:**

   ```bash
   npm run lint
   npm run build
   ```

   A `tsc` error here is almost always a misspelled `topic`, a `difficulty`
   outside the three allowed values, or a `rubric[].dim` outside its three.

   The one thing a build *will not* catch is an `answer` id that matches none of
   its own option ids — `answer` is a plain `string`, so `tsc` has nothing to
   compare it against. That compiles clean and then ships a question with no
   correct answer. Read it once more yourself.

6. **Open the PR** against `main` with a short description: the failure mode, and
   why it is worth reading. That description is what I use to decide whether to
   merge, so include the one sentence that made it interesting.

I review and merge contributions. If you would rather not open a PR, open an
issue with the failure mode and I will write it up.

### Contribution guidelines

- **One incident per PR.** It keeps the review and the blame history readable.
- **Do not edit other incidents** in the same PR. If you find a bug in one, open
  a separate PR or an issue.
- **Do not edit `DESIGN.md`, `app/globals.css`, or anything in `components/`**
  unless the PR is specifically about the UI. Content changes and design changes
  get reviewed separately.
- **Follow the existing voice.** Describes a system that broke, then why the
  obvious reading of the evidence was wrong.
- **Match the schema exactly.** `npm run build` is the contract.
- **Be honest about difficulty.** `hard` is fine; so is `easy`. A mislabelled
  difficulty is worse than either.

### CI checks

Every PR runs `.github/workflows/ci.yml`: `npm ci`, `npm run lint`,
`npm run build`, `npm test`, `npm run seo:validate`, plus one extra step.

`npm run seo:validate` checks the corpus against the SEO rules — duplicate
slugs/titles, eligibility failures, sitemap/eligibility mismatches, invalid
canonical paths, broken JSON-LD wiring — using the same functions the routes
use at render time, and exits non-zero on any ERROR.

Because the incidents are TypeScript, `npm run build` **is** most of the schema
validator — an unknown `topic`, a `difficulty` outside the three allowed values,
or a `rubric[].dim` outside its own three fails the build. No separate content
linter exists, deliberately: a second validator could only check a subset of
what `tsc` already checks, and the two would drift.

What CI does *not* catch, and neither does a local build:

- **An unregistered incident** — a new file under `content/incidents/` that
  nobody added to `index.ts`. It typechecks alone and the site builds fine; the
  incident is simply absent from the archive, the feed and the streak. This is
  the extra step, and it runs only when a PR *adds* a file in that directory,
  since editing an existing incident needs no registry change.
- **An `answer` id matching none of its own options.** `answer` is a plain
  `string`, so there is nothing for `tsc` to compare it against. A typo ships a
  question with no correct answer. This one needs a human, or a schema change I
  have not made yet — tightening `picks` to a generic keyed on `options` would
  close it properly if you want that.

## Design and agent conventions

- `DESIGN.md` is the source of truth for tokens, typography, layout and
  components. Never hardcode a colour, font, spacing value or radius — use the
  tokens, and extend `DESIGN.md` when a rule is missing.
- `AGENTS.md` carries repo rules for coding agents, including the Next.js 16
  breaking-change notice. Read it before writing code.
- Comments explain *why*, especially when the obvious version is wrong — see
  `lib/incidents.ts` and `lib/origin.ts` for the house style.

## License

Content and code in this repository are the work of
[Gurshaan](https://gurshaan.xyz). Ask before reusing.

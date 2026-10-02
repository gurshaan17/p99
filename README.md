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
| `VERCEL_PROJECT_PRODUCTION_URL` | auto on Vercel | Canonical origin (canonical URLs, RSS, OG tags) |
| `VERCEL_URL` | auto on Vercel | Fallback origin, overridden by the above |

`lib/origin.ts` is the single place the site's host is resolved — Vercel vars
win, with `https://p99.online` as the local-dev fallback. Nothing else should
hardcode a host.

Without the Redis vars the subscribe and prediction endpoints still build; they
simply stop rate limiting rather than 500-ing. See `lib/redis.ts`.

## Project layout

```text
app/                  routes — /, /archive, /topics, /q/[slug], /streak, /about,
                      plus /rss.xml, /llms.txt, /api/subscribe
components/
  shell/              frame, sidebar, topbar, mobile nav, search, command palette
  question/           the incident reader: picks, reveal, rubric, remember-gate
  archive/            archive grid/list, filters, streak record
  about/              subscribe + mailto signup forms
  ui/                 button, control, badge, keycap, nav-item
content/incidents/    ← one file per incident, this is where content lives
  types.ts            the Incident schema + curated TOPICS list
  index.ts            the registry: imports every incident, newest first
lib/                  incidents (queries), site config, origin, redis, metadata, nav
hooks/                useAttempt (in-memory answer state), useResolvedSlugs
DESIGN.md             design system — tokens, typography, layout, components
AGENTS.md             rules for coding agents working in this repo
```

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
| `publishedAt` | ISO date; **an incident dated in the future is hidden until that date** |
| `difficulty` | `easy` \| `medium` \| `hard` |
| `topic` | Exactly one of `caching` \| `databases` \| `runtime` \| `platform` |
| `tags` | Fine-grained; used for filtering and badges, never as a section |
| `symptom` | The situation the reader is dropped into, in prose |
| `constraints[]` | What the fix is not allowed to violate — the real difficulty |
| `evidence[]` | The telemetry clues; `picks` are answerable from these |
| `question` | What the reader is being asked to solve |
| `picks[]` | Multiple-choice diagnoses, each with `options[]` and an `answer` id that must match an option id |
| `diagnosis` | Markdown, multi-paragraph. What was actually wrong |
| `fix` | Markdown. What actually fixed it |
| `rubric[]` | How to score *this reader's* answer: `process` \| `correctness` \| `depth` |
| `remember[]` | The 3 compressed lessons, true regardless of how anyone reasoned |

`rubric` and `remember` are deliberately separate: the rubric scores a person's
answer and is self-checked, while `remember` is the compressed lesson and has
nothing to self-score.

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

2. **Copy the closest existing incident** as a starting point, rather than
   writing the schema from memory:

   ```bash
   cp content/incidents/017-rate-limiter-shared-state-redis.ts \
      content/incidents/018-your-slug.ts
   ```

   Then rewrite it. Copying gets the field set and the prose rhythm right;
   starting from an empty file gets them subtly wrong.

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

   A `tsc` error here is almost always a misspelled `topic`, an `answer` id that
   does not match any option, or a `rubric[].dim` outside the three allowed
   values.

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

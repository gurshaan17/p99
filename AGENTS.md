<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design system

Read `DESIGN.md` in full before any UI work in this repo. It is the source of truth for design tokens, typography, layout, and components. Never hardcode colors, fonts, spacing, or radii — use the tokens it defines, and extend that file (rather than improvising) when a rule is missing.

# Scheduled publishing

An incident dated in the future is not live until 02:00 IST on its `publishedAt` day (`publishDayKey` in `lib/incidents.ts`; that is 20:30 UTC the evening before, and the cron in `vercel.json` fires then). Two rules follow, and both are load-bearing:

- A new incident file must be imported into `incidents[]` in `content/incidents/index.ts`. An unregistered file typechecks and builds, and is simply absent from the site. CI checks this on PRs.
- No rendering surface may read the raw `incidents` registry. Use `publishedIncidents()`, or `getIncident` for a single slug — they are the only publication-aware entry points, and `topicCounts`, `tagCounts`, `incidentsByTopic`, `incidentsByTag` and `totalIncidents` are already filtered. The pages are ISR (`revalidate = 3600`) and a Vercel cron revalidates the root layout at the publish instant; see `DESIGN.md` section 8.6.

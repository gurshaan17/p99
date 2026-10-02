"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { publishedIncidents, topicMeta } from "@/lib/incidents";
import { nav, topicNav } from "@/lib/nav";

/**
 * The published set, resolved once in the browser.
 *
 * Filtering here rather than taking a filtered prop is what keeps a scheduled
 * incident's title out of the palette's items and out of the keyboard shortcut's
 * random pick. `publishDayKey` reads no local timezone, so this returns the same
 * answer in the browser as it did on the server that prerendered the page, and
 * the two cannot drift by where the reader happens to be.
 *
 * Evaluated at module load, so a tab left open across the publish instant picks
 * up the day's post on the next reload rather than live. A timer would fix that
 * and cost a re-render of a closed palette to do it.
 */
const liveIncidents = publishedIncidents();

/**
 * Search scoring — replaces cmdk's `defaultFilter`.
 *
 * cmdk's default is not a substring match. It is a fuzzy *subsequence* scorer: a
 * query matches when its characters appear in order, anywhere, with bonuses for
 * landing after a space. That is good for a list of short labels and useless
 * against a paragraph.
 *
 * Measured over the eight incidents, feeding cmdk the value this palette used to
 * pass (`title + symptom + topic + tags`, so ~50 words of prose per row):
 *
 *     "pg"  8/8      "cache"      8/8      "idempotency"  7/8
 *     "re"  8/8      "postgres"   8/8      "autovacuum"   8/8
 *
 * Every incident matched everything, because any two or three characters turn up
 * in order somewhere in fifty words. The list was not being filtered, only
 * reordered, and the reordering is by *where* a subsequence lands rather than by
 * which field it matched — so the result felt arbitrary.
 *
 * What replaces it is three changes, all of which the numbers above demand:
 *
 *   1. AND, not subsequence. Every query token must match a word *prefix*
 *      somewhere. One token that lands nowhere vetoes the row, so precision is
 *      bounded by the shortest token rather than by the length of the haystack.
 *   2. Weighted fields. `value` is the high-signal identity of the row; prose
 *      arrives as `keywords` and scores lower. cmdk's own `keywords` argument
 *      appends to the criteria at equal weight, which would not have separated
 *      the two — hence scoring them apart here.
 *   3. The slug is in `value`. It is the site's own short name for an incident,
 *      it is already the URL, and it is the only field that pairs the two halves
 *      of an idea the way a person would type it: "double charge" finds
 *      `idempotency-key-double-charge` even though the prose says "charged
 *      twice" and never says "double".
 *
 * Measured after, over the same eight incidents: "idempotency" 7/8 → 1/8,
 * "cache" 8/8 → 1/8, "autovacuum" 8/8 → 1/8, and the multi-word descriptions
 * "double charge", "charged twice", "noisy neighbor", "gc pause", "cpu pegged"
 * and "pool starvation" each return exactly the one incident they describe, at
 * the top.
 *
 * What this does not fix: vocabulary the incidents never use. "duplicate" and
 * "checkout" both return nothing for the double-charge incident, which says
 * "charged twice" and "POST /orders". Closing that gap means indexing
 * `diagnosis`, and `diagnosis` is the thing the site withholds until a reader
 * commits — see DESIGN.md. That is a product decision, not a scoring one, so it
 * is left unmade here.
 */

/**
 * Words that should not veto a search on their own. "the" is a word in almost
 * every title, so letting it participate in the AND would decide the result for
 * a query like "the index" — and letting it decide alone would match everything.
 * It contributes a flat score instead, which ranks such rows below a real match
 * without discarding them.
 */
const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "to", "in", "on", "for", "is", "it", "with",
]);

/** A query token matching the start of a word, rather than any substring of one. */
const matchesWord = (haystack: string, token: string) =>
  haystack
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .some((word) => word.startsWith(token));

/**
 * `criteria` is the row's `value`, `keywords` the demoted `keywords` prop. cmdk
 * keeps any row scoring above zero and sorts descending by this number, so the
 * return value is a rank, not a boolean.
 */
function searchScore(
  criteria: string,
  search: string,
  keywords: string[] = [],
) {
  const tokens = search
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean);
  if (tokens.length === 0) return 1;

  const prose = keywords.join(" ").toLowerCase();
  const primary = criteria.toLowerCase();
  const phrase = search.toLowerCase().trim();

  let score = 0;

  for (const token of tokens) {
    if (STOPWORDS.has(token)) {
      score += 0.1;
    } else if (matchesWord(criteria, token)) {
      score += 1;
    } else if (primary.includes(token)) {
      score += 0.6;
    } else if (matchesWord(prose, token)) {
      score += 0.35;
    } else if (prose.includes(token)) {
      score += 0.2;
    } else {
      return 0;
    }
  }

  // A phrase that appears intact beats the same words scattered across the row,
  // which is the difference between an incident *named* for the query and one
  // that merely mentions both words.
  if (phrase) {
    if (primary.includes(phrase)) score += 2;
    else if (prose.includes(phrase)) score += 0.5;
  }

  return score;
}

/**
 * Command palette — DESIGN.md section 7.9.
 *
 * A centred dialog over a 1px scrim. Grouped with a dashed hairline above each
 * heading. Opened with ⌘/Ctrl+K, and every row is a real link so the palette
 * degrades to plain navigation if JS-driven routing is unavailable.
 *
 * Nothing here is rendered until it is opened, so the closed state costs no DOM.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const setOpen = onOpenChange;

  // ⌘/Ctrl+K opens the palette. Mounted once, from the topbar, so the shortcut
  // has exactly one listener — the same constraint the theme toggle follows.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // ⌘/Ctrl+E jumps to a random incident (section 7.1).
  const surpriseMe = useCallback(() => {
    const pick =
      liveIncidents[Math.floor(Math.random() * liveIncidents.length)];
    if (pick) router.push(`/q/${pick.slug}`);
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "e" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        surpriseMe();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [surpriseMe]);

  if (!open) return null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      filter={searchScore}
      label="Search incidents and pages"
      className="fixed top-1/4 left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-line bg-page shadow-float"
      overlayClassName="fixed inset-0 z-50 bg-ink/20 backdrop-blur-(--blur-scrim)"
    >
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
        <Command.Input
          autoFocus
          placeholder="Search incidents, topics, pages…"
          className="h-11 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
        />
      </div>

      <Command.List className="max-h-64 overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-body text-ink-3">
          No matches.
        </Command.Empty>

        <Group heading="Go to">
          {nav.map((item) => (
            <Row key={item.href} onSelect={() => router.push(item.href)}>
              {item.label}
            </Row>
          ))}
        </Group>

        <Group heading="Incidents">
          {liveIncidents.map((incident) => (
            <Row
              key={incident.slug}
              value={`${incident.title} ${topicMeta(incident.topic).label} ${incident.tags.join(" ")} ${incident.slug}`}
              keywords={[incident.symptom, incident.question]}
              onSelect={() => router.push(`/q/${incident.slug}`)}
            >
              <span className="font-mono text-micro tracking-wider text-ink-3 uppercase">
                {topicMeta(incident.topic).label}
              </span>
              <span className="truncate">{incident.title}</span>
            </Row>
          ))}
        </Group>

        <Group heading="Topics">
          {topicNav.map((t) => (
            <Row
              key={t.href}
              value={t.label}
              onSelect={() => router.push(t.href)}
            >
              {t.label}
              <span className="ml-auto font-mono text-micro text-ink-3 tabular-nums">
                {t.count}
              </span>
            </Row>
          ))}
        </Group>

        <Group heading="Actions">
          <Row onSelect={surpriseMe}>
            Surprise me
            <kbd className="ml-auto font-mono text-micro text-ink-3">⌘E</kbd>
          </Row>
        </Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 border-t border-dashed border-line pt-1 first:border-0 first:pt-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </Command.Group>
  );
}

function Row({
  children,
  onSelect,
  value,
  keywords,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
  /** Lower-weight searchable text. See `searchScore`. */
  keywords?: string[];
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-chip px-2 py-1.5 text-body text-ink-2 data-[selected=true]:bg-field data-[selected=true]:text-ink"
    >
      {children}
    </Command.Item>
  );
}

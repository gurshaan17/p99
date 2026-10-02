"use client";

import { useMemo, useState } from "react";
import {
  DIFFICULTIES,
  matchTags,
  tagCounts,
  type Incident,
} from "@/lib/incidents";
import { useResolvedSlugs } from "@/hooks/useResolvedSlugs";
import { ArchiveFilter } from "@/components/archive/filters";
import { TagSearch } from "@/components/archive/tag-search";
import { ViewToggle, useArchiveView } from "@/components/archive/view-toggle";
import { ListRow } from "@/components/archive/list-row";
import { GridCard } from "@/components/archive/grid-card";

/**
 * Archive body — DESIGN.md sections 7.1, 7.3, 7.4, 7.6, 7.12, 8.4.
 *
 * Client because filter and view state live here. The list/grid switch sits with
 * the filters rather than in the global topbar: it only means something on a
 * route that actually has two views, and keeping it here means one owner for the
 * state instead of a shared context.
 *
 * The server renders the default list view, so first paint is complete without
 * JS and the persisted view is applied after mount. The same is true of the
 * progress marks: the server has no localStorage, so every row starts unmarked and
 * a returning reader's own incidents get their mark on hydration.
 *
 * The tag axis is a search field rather than a menu — the vocabulary outgrew a
 * listbox. Two behaviours are worth stating because they are the ones a reader can
 * feel: the match is an OR across an incident's tags, so typing `postgres` surfaces
 * every Postgres incident even where those also carry `autovacuum` or `bloat`; and
 * a tag chosen from the suggestions pins to that one tag exactly, which is the only
 * way to narrow when the word typed is an infix of several tags. A search that
 * matched nothing leaves the list alone rather than emptying it — see the empty
 * state below, which is reserved for the filters that can legitimately match
 * nothing.
 *
 * The matches come from `matchTags`, over the same published `tagCounts` the old
 * chip list was built from, so a tag that exists only on an incident that is not
 * live yet cannot be offered as a filter that returns nothing.
 */
export function ArchiveView({ incidents }: { incidents: Incident[] }) {
  const [view, setView] = useArchiveView();
  const [tagQuery, setTagQuery] = useState("");
  const [pinnedTag, setPinnedTag] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [progress, setProgress] = useState<ProgressFilter>("all");
  const resolved = useResolvedSlugs();

  const tagMatches = useMemo(
    () =>
      pinnedTag
        ? tagCounts.filter((entry) => entry.tag === pinnedTag)
        : matchTags(tagQuery),
    [pinnedTag, tagQuery],
  );

  // A Set because this is the innermost test of the predicate and it runs once per
  // incident per keystroke; `includes` over an array would be the same result a few
  // times slower for no gain.
  const activeTags = useMemo(
    () => new Set(tagMatches.map((entry) => entry.tag)),
    [tagMatches],
  );
  const filteringTags = activeTags.size > 0;

  const filtered = incidents.filter(
    (i) =>
      (!filteringTags || i.tags.some((tag) => activeTags.has(tag))) &&
      (difficulty === "all" || i.difficulty === difficulty) &&
      (progress === "all" || !resolved.has(i.slug)),
  );

  return (
    <div className="flex flex-col gap-block">
      <div className="flex flex-wrap items-center gap-item">
        {/*
          The tag axis, and the only control here that takes free text. It goes first
          because it is the one a reader reaches for by typing rather than by
          pointing, and a field that follows two menus is a field that gets skipped.
        */}
        <TagSearch
          matches={tagMatches}
          value={tagQuery}
          pinnedTag={pinnedTag}
          resultCount={filtered.length}
          totalCount={incidents.length}
          onValueChange={setTagQuery}
          onPin={setPinnedTag}
        />
        <ArchiveFilter
          label="Level"
          options={["all", ...DIFFICULTIES] as const}
          value={difficulty}
          onChange={setDifficulty}
        />
        {/*
          The one filter here that is about the reader rather than the incident.
          `unread` is the useful direction — hiding what is already done is a
          queue; hiding what is not done is a backlog, and this site ships one
          incident a day, so the backlog is every future post.
        */}
        <ArchiveFilter
          label="Progress"
          options={PROGRESS_FILTERS}
          value={progress}
          onChange={setProgress}
        />

        <p className="ml-auto font-mono text-micro text-ink-3 tabular-nums">
          {filtered.length} of {incidents.length}
        </p>

        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-body text-ink-3">
          Nothing matches those filters.
        </p>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((incident) => (
            <li key={incident.slug}>
              <GridCard
                incident={incident}
                solved={resolved.has(incident.slug)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="list-rows flex flex-col">
          {filtered.map((incident) => (
            <ListRow
              key={incident.slug}
              incident={incident}
              solved={resolved.has(incident.slug)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type DifficultyFilter = "all" | (typeof DIFFICULTIES)[number];
type ProgressFilter = (typeof PROGRESS_FILTERS)[number];

const PROGRESS_FILTERS = ["all", "unread"] as const;

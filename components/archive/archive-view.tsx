"use client";

import { useState } from "react";
import { DIFFICULTIES, type Incident } from "@/lib/incidents";
import { tags } from "@/lib/incidents";
import { useResolvedSlugs } from "@/hooks/useResolvedSlugs";
import { ArchiveFilter } from "@/components/archive/filters";
import { ViewToggle, useArchiveView } from "@/components/archive/view-toggle";
import { ListRow } from "@/components/archive/list-row";
import { GridCard } from "@/components/archive/grid-card";

/**
 * Archive body — DESIGN.md sections 7.1, 7.3, 7.4, 7.6.
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
 * The tag filter is an OR across an incident's tags: filtering to `postgres`
 * should surface every Postgres incident even though those incidents also carry
 * `autovacuum` or `bloat`.
 */
export function ArchiveView({ incidents }: { incidents: Incident[] }) {
  const [view, setView] = useArchiveView();
  const [tag, setTag] = useState<TagFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [progress, setProgress] = useState<ProgressFilter>("all");
  const resolved = useResolvedSlugs();

  const filtered = incidents.filter(
    (i) =>
      (tag === "all" || i.tags.includes(tag)) &&
      (difficulty === "all" || i.difficulty === difficulty) &&
      (progress === "all" || !resolved.has(i.slug)),
  );

  return (
    <div className="flex flex-col gap-block">
      <div className="flex flex-wrap items-center gap-item">
        <ArchiveFilter
          label="Tag"
          options={["all", ...tags] as const}
          value={tag}
          onChange={setTag}
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

type TagFilter = "all" | (typeof tags)[number];
type DifficultyFilter = "all" | (typeof DIFFICULTIES)[number];
type ProgressFilter = (typeof PROGRESS_FILTERS)[number];

const PROGRESS_FILTERS = ["all", "unread"] as const;

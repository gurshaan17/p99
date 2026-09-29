"use client";

import { useState } from "react";
import { DIFFICULTIES, type Incident } from "@/lib/incidents";
import { tags } from "@/lib/incidents";
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
 * JS and the persisted view is applied after mount.
 *
 * The tag filter is an OR across an incident's tags: filtering to `postgres`
 * should surface every Postgres incident even though those incidents also carry
 * `autovacuum` or `bloat`.
 */
export function ArchiveView({ incidents }: { incidents: Incident[] }) {
  const [view, setView] = useArchiveView();
  const [tag, setTag] = useState<TagFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");

  const filtered = incidents.filter(
    (i) =>
      (tag === "all" || i.tags.includes(tag)) &&
      (difficulty === "all" || i.difficulty === difficulty),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
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
              <GridCard incident={incident} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="list-rows flex flex-col">
          {filtered.map((incident) => (
            <ListRow key={incident.slug} incident={incident} />
          ))}
        </ul>
      )}
    </div>
  );
}

type TagFilter = "all" | (typeof tags)[number];
type DifficultyFilter = "all" | (typeof DIFFICULTIES)[number];

"use client";

import { useState } from "react";
import type { Question } from "@/lib/questions";
import { TOPICS } from "@/lib/questions";
import { difficultyOptions } from "@/components/ui/badge";
import { ArchiveFilter } from "@/components/archive/filters";
import { ViewToggle, useArchiveView } from "@/components/archive/view-toggle";
import { ListRow } from "@/components/archive/list-row";
import { GridCard } from "@/components/archive/grid-card";

/**
 * Archive body — DESIGN.md sections 7.1, 7.3, 7.4, 7.6.
 *
 * Client because filter and view state live here. The list/grid switch sits with
 * the filters rather than in the global topbar: it only means something on a
 * route that actually has two views, and keeping it here means one owner for
 * the state instead of a shared context.
 *
 * The server renders the default list view, so first paint is complete without
 * JS and the persisted view is applied after mount.
 */
export function ArchiveView({ questions }: { questions: Question[] }) {
  const [view, setView] = useArchiveView();
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");

  const filtered = questions.filter(
    (q) =>
      (topic === "all" || q.topic === topic) &&
      (difficulty === "all" || q.difficulty === difficulty),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ArchiveFilter
          label="Topic"
          options={["all", ...TOPICS] as const}
          value={topic}
          onChange={setTopic}
        />
        <ArchiveFilter
          label="Level"
          options={["all", ...difficultyOptions] as const}
          value={difficulty}
          onChange={setDifficulty}
        />

        <p className="ml-auto font-mono text-micro text-ink-3 tabular-nums">
          {filtered.length} of {questions.length}
        </p>

        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-body text-ink-3">
          Nothing matches those filters.
        </p>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((q) => (
            <li key={q.slug}>
              <GridCard question={q} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="list-rows flex flex-col">
          {filtered.map((q) => (
            <ListRow key={q.slug} question={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

type TopicFilter = "all" | (typeof TOPICS)[number];
type DifficultyFilter = "all" | (typeof difficultyOptions)[number];

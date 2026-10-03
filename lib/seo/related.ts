/**
 * Deterministic related-content engine.
 *
 * Signals, in priority order: same topic, then shared tags (a meaningful
 * tag overlap — an incident about redis and an incident about GC share no
 * tag, so the link never happens). Nothing else. No embeddings, no AI
 * similarity, no time-based shuffling — the same incident always returns the
 * same neighbours, which is what makes the output cacheable and testable.
 *
 * Cost is linear in tag memberships, not in pages × pages: candidates come
 * from two prebuilt indexes (incidents-by-topic, incidents-by-tag), and the
 * score is only computed for the union of both neighbour lists. At 100k
 * incidents with a typical vocabulary the union stays in the low tens, so a
 * render never scans the corpus.
 *
 * The indexes are derived from the published set once per publish-day (the
 * same cache lifetime as every other list in `lib/incidents.ts`), so a
 * scheduled incident cannot leak through a "related" link before its
 * publish instant.
 */

import { publishedIncidents, publishDayKey, type Incident, type Topic, TOPICS } from "@/lib/incidents";

const SCORE_SAME_TOPIC = 2;
const SCORE_PER_SHARED_TAG = 1;
/** Cap so a runaway tag ("production") cannot outrank a real topical match. */
const MAX_TAG_CONTRIBUTION = 3;

export const RELATED_LIMIT = 4;

interface RelatedIndex {
  byTopic: Map<Topic, Incident[]>;
  byTag: Map<string, Incident[]>;
  topicIds: Topic[];
}

let cached: { key: string; index: RelatedIndex } | undefined;

/** The current published set's key — rebuilt only when the publish day flips. */
function publishKey(): string {
  return publishDayKey();
}

function getIndex(): RelatedIndex {
  const key = publishKey();
  if (cached?.key === key) return cached.index;

  const byTopic = new Map<Topic, Incident[]>();
  const byTag = new Map<string, Incident[]>();
  for (const topic of TOPICS) byTopic.set(topic.id, []);

  for (const incident of publishedIncidents()) {
    byTopic.get(incident.topic)?.push(incident);
    for (const tag of incident.tags) {
      const list = byTag.get(tag) ?? [];
      list.push(incident);
      byTag.set(tag, list);
    }
  }

  const index: RelatedIndex = { byTopic, byTag, topicIds: TOPICS.map((t) => t.id) };
  cached = { key, index };
  return index;
}

/**
 * Score candidates deterministically. Tie-breaks are by publishedAt, then
 * slug, so the order is total and the output stable across renders.
 */
export function getRelatedIncidents(incident: Incident, limit = RELATED_LIMIT): Incident[] {
  const index = getIndex();
  const scores = new Map<string, { incident: Incident; score: number }>();

  const add = (candidate: Incident, contribution: number) => {
    if (candidate.slug === incident.slug) return; // no self-links, ever
    const entry = scores.get(candidate.slug);
    scores.set(candidate.slug, {
      incident: candidate,
      score: (entry?.score ?? 0) + contribution,
    });
  };

  for (const sibling of index.byTopic.get(incident.topic) ?? []) {
    add(sibling, SCORE_SAME_TOPIC);
  }

  // Tag contribution is capped per candidate so breadth of anodyne tags never
  // outranks one genuinely on-topic shared tag plus the topic itself.
  const tagHits = new Map<string, { incident: Incident; hits: number }>();
  for (const tag of incident.tags) {
    for (const candidate of index.byTag.get(tag) ?? []) {
      if (candidate.slug === incident.slug) continue;
      const hit = tagHits.get(candidate.slug);
      tagHits.set(candidate.slug, { incident: candidate, hits: (hit?.hits ?? 0) + 1 });
    }
  }
  for (const { incident: candidate, hits } of tagHits.values()) {
    add(candidate, Math.min(hits, MAX_TAG_CONTRIBUTION) * SCORE_PER_SHARED_TAG);
  }

  return [...scores.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.incident.publishedAt.localeCompare(a.incident.publishedAt) ||
        a.incident.slug.localeCompare(b.incident.slug),
    )
    .slice(0, limit)
    .map((entry) => entry.incident);
}

/**
 * Topics related to a topic hub: the topics whose incidents most often share
 * tags with this one. Same bounded, indexed approach — not "every topic".
 */
export function getRelatedTopics(topic: Topic, limit = 3): Topic[] {
  const index = getIndex();
  const inTopic = index.byTopic.get(topic) ?? [];
  const votes = new Map<Topic, number>();

  for (const incident of inTopic) {
    for (const tag of incident.tags) {
      for (const candidate of index.byTag.get(tag) ?? []) {
        if (candidate.topic === topic) continue;
        votes.set(candidate.topic, (votes.get(candidate.topic) ?? 0) + 1);
      }
    }
  }

  return [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);
}

import { describe, expect, it } from "vitest";
import { publishedIncidents } from "@/lib/incidents";
import { getRelatedIncidents, getRelatedTopics, RELATED_LIMIT } from "./related";

const incidents = publishedIncidents();

describe("getRelatedIncidents", () => {
  it("never returns the incident itself", () => {
    for (const incident of incidents) {
      expect(getRelatedIncidents(incident).map((r) => r.slug)).not.toContain(incident.slug);
    }
  });

  it("is bounded", () => {
    for (const incident of incidents) {
      expect(getRelatedIncidents(incident).length).toBeLessThanOrEqual(RELATED_LIMIT);
    }
  });

  it("is deterministic across calls", () => {
    for (const incident of incidents) {
      expect(getRelatedIncidents(incident).map((r) => r.slug)).toEqual(
        getRelatedIncidents(incident).map((r) => r.slug),
      );
    }
  });

  it("only returns real, published incident objects", () => {
    const valid = new Set(incidents.map((i) => i.slug));
    for (const incident of incidents) {
      for (const rel of getRelatedIncidents(incident)) {
        expect(valid.has(rel.slug)).toBe(true);
      }
    }
  });

  it("same-topic incidents outrank unshared-tag candidates", () => {
    const incident = incidents[0];
    const sameTopic = incidents.filter(
      (i) => i.topic === incident.topic && i.slug !== incident.slug,
    );
    const related = getRelatedIncidents(incident);
    if (sameTopic.length > 0 && related.length > 0) {
      expect(sameTopic.map((i) => i.slug)).toContain(related[0].slug);
    }
  });
});

describe("getRelatedTopics", () => {
  it("returns real topic ids and does not include the topic itself", () => {
    for (const incident of incidents.slice(0, 4)) {
      const related = getRelatedTopics(incident.topic);
      expect(related).not.toContain(incident.topic);
      expect(related.length).toBeLessThanOrEqual(3);
    }
  });
});

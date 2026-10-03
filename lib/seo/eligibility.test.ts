import { describe, expect, it } from "vitest";
import type { Incident } from "@/lib/incidents";
import { getIncidentEligibility, ELIGIBILITY_THRESHOLDS } from "./eligibility";
import { publishedIncidents } from "@/lib/incidents";

const base = publishedIncidents()[0];

function makeIncident(overrides: Partial<Incident>): Incident {
  return { ...base, ...overrides };
}

describe("getIncidentEligibility", () => {
  it("indexes a complete incident", () => {
    expect(getIncidentEligibility(base)).toEqual({
      indexable: true,
      reasons: ["unique-content"],
    });
  });

  it("noindexes an incident missing evidence", () => {
    const result = getIncidentEligibility(makeIncident({ evidence: [] }));
    expect(result.indexable).toBe(false);
    expect(result.reasons).toContain("incomplete-content");
  });

  it("noindexes an incident with a placeholder-length symptom", () => {
    const result = getIncidentEligibility(makeIncident({ symptom: "short" }));
    expect(result.indexable).toBe(false);
  });

  it("noindexes a non-kebab-case slug", () => {
    const result = getIncidentEligibility(makeIncident({ slug: "Bad_Slug" }));
    expect(result.indexable).toBe(false);
    expect(result.reasons).toContain("no-search-intent");
  });

  it("every published incident passes the gate on today's corpus", () => {
    for (const incident of publishedIncidents()) {
      const result = getIncidentEligibility(incident);
      expect(result.indexable, `${incident.slug}: ${result.reasons}`).toBe(true);
    }
  });

  it("thresholds are exported so validators and pages agree", () => {
    expect(ELIGIBILITY_THRESHOLDS.minTopicIncidents).toBeGreaterThan(0);
  });
});

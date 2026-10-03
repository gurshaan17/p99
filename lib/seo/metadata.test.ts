import { describe, expect, it } from "vitest";
import { publishedIncidents } from "@/lib/incidents";
import { buildIncidentSEOPage, buildTopicSEOPage } from "./pages";
import { buildMetadata } from "./metadata";

const incidents = publishedIncidents();
const incident = incidents[0];

describe("buildMetadata", () => {
  it("sets the entity title and symptom as description", () => {
    const meta = buildMetadata(buildIncidentSEOPage(incident));
    expect(meta.title).toBe(incident.title);
    expect(meta.description).toBe(incident.symptom);
  });

  it("produces a deterministic root-relative canonical", () => {
    const meta = buildMetadata(buildIncidentSEOPage(incident));
    expect(meta.alternates?.canonical).toBe(`/q/${incident.slug}`);
  });

  it("keeps the layout's OG image and sets page url/title", () => {
    const meta = buildMetadata(buildIncidentSEOPage(incident));
    const og = meta.openGraph as Record<string, unknown> | undefined;
    const twitter = meta.twitter as Record<string, unknown> | undefined;
    expect(og?.url).toBe(`/q/${incident.slug}`);
    expect(og?.title).toBe(incident.title);
    expect(og?.images).toHaveLength(1);
    expect(twitter?.card).toBe("summary_large_image");
  });

  it("emits unique titles/descriptions per incident", () => {
    const metas = incidents.map((i) => buildMetadata(buildIncidentSEOPage(i)));
    expect(new Set(metas.map((m) => m.title)).size).toBe(incidents.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(incidents.length);
  });

  it("marks eligible pages indexable and ineligible pages noindex", () => {
    const ok = buildMetadata(buildTopicSEOPage("databases"));
    expect(ok.robots).toMatchObject({ index: true });

    const thin = buildIncidentSEOPage(incident);
    thin.eligibility = { indexable: false, reasons: ["incomplete-content"] };
    const meta = buildMetadata(thin);
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });
});

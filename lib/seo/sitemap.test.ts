import { describe, expect, it } from "vitest";
import { incidentSitemapEntries, staticSitemapEntries, topicSitemapEntries } from "./sitemap";
import { publishedIncidents, TOPICS, incidentsByTopic } from "@/lib/incidents";

const all = [...staticSitemapEntries(), ...topicSitemapEntries(), ...incidentSitemapEntries()];

describe("sitemap entries", () => {
  it("have unique, absolute, canonical locs", () => {
    const locs = all.map((e) => e.loc);
    expect(new Set(locs).size).toBe(locs.length);
    for (const loc of locs) {
      expect(loc).toMatch(/^https:\/\//);
      expect(loc).not.toContain("?");
      expect(loc.endsWith("/") ? loc.length : true).toBeTruthy();
    }
  });

  it("have valid lastmod dates", () => {
    for (const entry of all) {
      expect(Number.isNaN(Date.parse(entry.lastModified)), entry.loc).toBe(false);
    }
  });

  it("contain every eligible incident and only eligible ones", () => {
    const incidentLocs = new Set(incidentSitemapEntries().map((e) => e.loc));
    for (const incident of publishedIncidents()) {
      expect(incidentLocs.has(`${incidentSitemapEntries()[0]?.loc.split("/q/")[0]}/q/${incident.slug}`)).toBe(true);
    }
  });

  it("topic entries match the topics that have content", () => {
    const inSitemap = new Set(topicSitemapEntries().map((e) => e.loc));
    for (const topic of TOPICS) {
      const loc = `${staticSitemapEntries()[0].loc.split("/").slice(0, 3).join("/")}/topics/${topic.id}`;
      if (incidentsByTopic(topic.id).length >= 2) {
        expect(inSitemap.has(loc)).toBe(true);
      }
    }
  });
});

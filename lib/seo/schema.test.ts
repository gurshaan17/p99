import { describe, expect, it } from "vitest";
import { publishedIncidents, TOPICS } from "@/lib/incidents";
import { incidentBreadcrumbs, topicBreadcrumbs } from "./breadcrumbs";
import { breadcrumbSchema, incidentSchema, topicSchema } from "./schema";

const incidents = publishedIncidents();
const incident = incidents[0];

describe("schema", () => {
  it("incident schema is Article with truthful fields", () => {
    const schema = incidentSchema(incident);
    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe(incident.title);
    expect(schema.datePublished).toBe(incident.publishedAt);
    expect(schema.mainEntityOfPage).toContain(`/q/${incident.slug}`);
  });

  it("topic schema is CollectionPage and lists only real incidents", () => {
    const schema = topicSchema(TOPICS[0].id, incidents.filter((i) => i.topic === TOPICS[0].id));
    expect(schema["@type"]).toBe("CollectionPage");
    for (const part of schema.hasPart) {
      expect(part.url).toContain("/q/");
    }
  });

  it("breadcrumb schema matches the visible breadcrumb array", () => {
    const crumbs = incidentBreadcrumbs(incident);
    const schema = breadcrumbSchema(crumbs);
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(crumbs.length);
    schema.itemListElement.forEach((item, i) => {
      expect(item.position).toBe(i + 1);
      expect(item.name).toBe(crumbs[i].name);
    });
  });

  it("topic breadcrumbs have Home > Topics > Topic", () => {
    const crumbs = topicBreadcrumbs(incident.topic);
    expect(crumbs.map((c) => c.name)).toEqual(["Home", "Topics", expect.any(String)]);
    expect(crumbs[0].path).toBe("/");
    expect(crumbs[1].path).toBe("/topics");
  });

  it("JSON-LD serializes without fabricated FAQ content", () => {
    const json = JSON.stringify([incidentSchema(incident), breadcrumbSchema(incidentBreadcrumbs(incident))]);
    expect(json).not.toContain("FAQPage");
    expect(JSON.parse(json)).toHaveLength(2);
  });
});

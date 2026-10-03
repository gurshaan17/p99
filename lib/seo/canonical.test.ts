import { describe, expect, it } from "vitest";
import { canonicalPath, incidentPath, topicPath, absoluteCanonical } from "./canonical";

describe("canonicalPath", () => {
  it("strips query strings and hashes", () => {
    expect(canonicalPath("/q/foo?utm_source=x#frag")).toBe("/q/foo");
  });

  it("strips trailing slashes except root", () => {
    expect(canonicalPath("/topics/databases/")).toBe("/topics/databases");
    expect(canonicalPath("/")).toBe("/");
  });

  it("normalizes casing and missing leading slash", () => {
    expect(canonicalPath("Topics/Databases")).toBe("/topics/databases");
  });

  it("entity paths are stable", () => {
    expect(incidentPath("cache-stampede")).toBe("/q/cache-stampede");
    expect(topicPath("caching")).toBe("/topics/caching");
    expect(absoluteCanonical("https://p99.online/", "/q/x")).toBe("https://p99.online/q/x");
  });
});

/**
 * One breadcrumb trail per page type, derived from the same parentPath the
 * URL already implies — Home > Topics > Topic > Incident. The visible nav and
 * the JSON-LD `BreadcrumbList` are generated from the same array, so they can
 * never disagree (a breadcrumb schema that does not match the page is worse
 * than none).
 */

import { topicMeta, type Incident } from "@/lib/incidents";
import { topicPath } from "./canonical";
import type { Breadcrumb } from "./types";

export function homeBreadcrumbs(): Breadcrumb[] {
  return [{ name: "Home", path: "/" }];
}

export function topicBreadcrumbs(topic: Parameters<typeof topicMeta>[0]): Breadcrumb[] {
  return [
    { name: "Home", path: "/" },
    { name: "Topics", path: "/topics" },
    { name: topicMeta(topic).label, path: topicPath(topic) },
  ];
}

export function incidentBreadcrumbs(incident: Incident): Breadcrumb[] {
  return [
    { name: "Home", path: "/" },
    { name: "Topics", path: "/topics" },
    { name: topicMeta(incident.topic).label, path: topicPath(incident.topic) },
    { name: incident.title, path: `/q/${incident.slug}` },
  ];
}

import { getTotalVisitors } from "@/lib/vercel-analytics";

/**
 * Sidebar total visitor count — DESIGN.md section 2.2.
 *
 * It sits in the sidebar footer, above the quiet link row, because it is
 * metadata about the site rather than a navigation action. Server-rendered and
 * cached for an hour like the pages; the Vercel Analytics component already
 * reports the data this component reads.
 */
export async function VisitorCount() {
  const visitors = await getTotalVisitors();

  if (visitors === null) return null;

  return (
    <p className="mb-item font-mono text-micro text-ink-3">
      <span className="tabular-nums text-ink-2">
        {visitors.toLocaleString("en-US")}
      </span>{" "}
      total visitors
    </p>
  );
}

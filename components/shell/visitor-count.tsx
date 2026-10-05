import { getTotalVisitors } from "@/lib/vercel-analytics";

/**
 * Footer total visitor count — DESIGN.md section 2.2.
 *
 * It sits above the quiet link row in both footers, because it is metadata
 * about the site rather than a navigation action. Server-rendered and cached for an hour like the pages; the Vercel Analytics component already
 * reports the data this component reads.
 */
export async function VisitorCount({
  align = "start",
}: {
  align?: "start" | "center";
}) {
  const visitors = await getTotalVisitors();

  if (visitors === null) return null;

  return (
    <p
      className={`mb-item font-mono text-micro text-ink-3${
        align === "center" ? " text-center" : ""
      }`}
    >
      <span className="tabular-nums text-ink-2">
        {visitors.toLocaleString("en-US")}
      </span>{" "}
      total visitors
    </p>
  );
}

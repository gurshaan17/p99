/**
 * Vercel Web Analytics totals — the one place that knows the endpoint shape.
 *
 * Server-only. `VERCEL_ACCESS_TOKEN` (or `VERCEL_TOKEN`) is read from the
 * environment and must never reach the client bundle.
 *
 * This is production data since Web Analytics was enabled. A missing token or
 * failed request returns `null` so the sidebar can hide the count rather than
 * render a broken or fake number.
 */
export async function getTotalVisitors(): Promise<number | null> {
  const token = process.env.VERCEL_ACCESS_TOKEN ?? process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) return null;

  const params = new URLSearchParams({ projectId });

  // A personal project omits both. Vercel needs one team pointer for team
  // projects; `teamId` outranks `slug` because it is the exact identifier.
  if (process.env.VERCEL_TEAM_ID) {
    params.set("teamId", process.env.VERCEL_TEAM_ID);
  } else if (process.env.VERCEL_TEAM_SLUG) {
    params.set("slug", process.env.VERCEL_TEAM_SLUG);
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/visits/count?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) return null;

    const json = (await response.json()) as {
      data?: { visitors?: unknown };
    };

    return typeof json.data?.visitors === "number"
      ? json.data.visitors
      : null;
  } catch {
    return null;
  }
}

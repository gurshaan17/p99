import { getRedis } from "@/lib/redis";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

/**
 * One-click unsubscribe.
 *
 * The link is minted per recipient with an HMAC of their address (see
 * `lib/unsubscribe.ts`), so the route can tell a link we generated from a
 * hand-typed URL before touching the list.
 *
 * GET shows the result as a page — that is the browser case, since Gmail's
 * one-click and a reader's mis-tap both surface as GETs with no prior
 * visit. POST is the List-Unsubscribe-Post one-click form: email clients
 * (Gmail/Yahoo) POST `List-Unsubscribe=One-Click` with no UI round-trip, and
 * per the bulk-sender requirements a valid one-click request must remove the
 * address directly. Both perform the removal; they differ only in the
 * response body.
 */

const SUBSCRIBERS_KEY = "p99:subscribers";

function htmlPage(title: string, body: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Geist+Mono&display=swap" rel="stylesheet" />
  <style>body { font-family: Geist, -apple-system, "Segoe UI", Roboto, sans-serif; } .mono { font-family: "Geist Mono", ui-monospace, Menlo, monospace; }</style>
</head>
<body style="margin:0;background:#f4f4f5;">
  <div style="max-width:600px;margin:0 auto;padding:48px 20px;background:#ffffff;min-height:100vh;">
    <p class="mono" style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">p99&nbsp;&nbsp;·&nbsp;&nbsp;unsubscribe</p>
    <hr style="border:none;border-top:1px dashed #e4e4e7;margin:20px 0;" />
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#111111;">${title}</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${body}</p>
  </div>
</body>
</html>`;
}

function parseParams(request: Request): { email?: string; token?: string } {
  const url = new URL(request.url);
  return {
    email: url.searchParams.get("email") ?? undefined,
    token: url.searchParams.get("token") ?? undefined,
  };
}

async function unsubscribe(
  email: string | undefined,
  token: string | undefined,
): Promise<{ ok: boolean; error?: string }> {
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return { ok: false, error: "This unsubscribe link is not valid." };
  }
  try {
    await getRedis().srem(SUBSCRIBERS_KEY, email.trim().toLowerCase());
  } catch (error) {
    console.error("unsubscribe: SREM failed", { error: String(error) });
    return { ok: false, error: "Something went wrong. Try again shortly." };
  }
  return { ok: true };
}

export async function GET(request: Request) {
  const { email, token } = parseParams(request);
  const result = await unsubscribe(email, token);
  if (!result.ok) {
    return new Response(
      htmlPage("Link not valid.", "This unsubscribe link is missing or has been tampered with. Open the link from the email itself."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  return new Response(
    htmlPage("You're unsubscribed.", "You will no longer receive the daily incident. Changed your mind? Subscribe again at <a href=\"https://p99.online/about\" style=\"color:#7c3aed;\">p99.online/about</a>."),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function POST(request: Request) {
  const { email, token } = parseParams(request);
  const result = await unsubscribe(email, token);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return new Response("Unsubscribed.", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

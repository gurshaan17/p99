import { getRedis } from "@/lib/redis";

/**
 * SES bounce/complaint feed, via SNS.
 *
 * Verification — shared secret, and here is why:
 * SNS HTTP subscriptions cannot set custom headers, so a secret can only
 * travel in the subscribe URL itself (`?secret=...`). The alternative —
 * validating the SNS message signature — requires fetching AWS's signing
 * cert, checking expiry, and a maintained verification library; the old
 * one in the ecosystem is unmaintained, and SES's abuse surface here is
 * low: a forged "complaint" could only remove an address from our own list,
 * which the sender of that address can already do with one click. The URL
 * secret is unguessable and the URL itself is not listed anywhere. If a
 * stricter posture is ever needed, SNS signature validation drops in here
 * without changing anything about the SES event handling below.
 */

const SUBSCRIBERS_KEY = "p99:subscribers";

function authorized(request: Request): boolean {
  const secret = process.env.SNS_WEBHOOK_SECRET;
  if (!secret) return false;
  return new URL(request.url).searchParams.get("secret") === secret;
}

/**
 * SNS subscription confirmation: AWS PUTs a "SubscriptionConfirmation" with
 * a SubscribeURL that must be fetched, or SNS never delivers notifications.
 * The URL host is checked against the amazonaws.com domain family so this
 * endpoint cannot be tricked into GETting an arbitrary URL — a bare `fetch()`
 * of an attacker-supplied URL is an SSRF primitive.
 */
interface SnsMessage {
  Type?: string;
  Message?: string;
  SubscribeURL?: string;
}

async function confirmSubscription(message: SnsMessage): Promise<void> {
  const url = message.SubscribeURL;
  if (!url) throw new Error("SubscriptionConfirmation with no SubscribeURL");
  const host = new URL(url).hostname;
  if (!host.endsWith(".amazonaws.com")) {
    throw new Error(`Refusing to confirm subscription from host ${host}`);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`SubscribeURL fetch failed: ${response.status}`);
}

interface SesEvent {
  eventType?: string;
  bounce?: { bounceType?: string; bouncedRecipients?: { emailAddress?: string }[] };
  complaint?: { complainedRecipients?: { emailAddress?: string }[] };
}

async function handleNotification(message: SnsMessage): Promise<void> {
  if (!message.Message) return;
  const event: SesEvent = JSON.parse(message.Message);

  if (event.eventType === "Bounce") {
    const type = event.bounce?.bounceType;
    const addresses = (event.bounce?.bouncedRecipients ?? [])
      .map((r) => r.emailAddress?.toLowerCase())
      .filter((a): a is string => Boolean(a));
    if (type === "Permanent") {
      for (const address of addresses) {
        await getRedis().srem(SUBSCRIBERS_KEY, address);
        console.log("ses-notifications: removed after permanent bounce", address);
      }
    } else {
      // Transient (and Undetermined) bounces get logged, not removed:
      // removing on the first one would drop real readers behind a full
      // mailbox. Repeat-offender pruning is a deliberate later refinement.
      console.log("ses-notifications: bounce logged, not removed", {
        type,
        count: addresses.length,
      });
    }
  }

  if (event.eventType === "Complaint") {
    const addresses = (event.complaint?.complainedRecipients ?? [])
      .map((r) => r.emailAddress?.toLowerCase())
      .filter((a): a is string => Boolean(a));
    for (const address of addresses) {
      // A complaint is a hard signal — remove immediately, no patience.
      await getRedis().srem(SUBSCRIBERS_KEY, address);
      console.log("ses-notifications: removed after complaint", address);
    }
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let sns: SnsMessage;
  try {
    sns = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (sns.Type === "SubscriptionConfirmation") {
      await confirmSubscription(sns);
      console.log("ses-notifications: subscription confirmed");
    } else if (sns.Type === "Notification") {
      await handleNotification(sns);
    } else {
      // UnsubscribeConfirmation and unknown types: acknowledged, no action.
      console.log("ses-notifications: unhandled SNS type", sns.Type);
    }
  } catch (error) {
    // 500 so SNS retries the delivery — a transient failure must not be
    // acknowledged as success, and the retry is what makes the confirmation
    // eventually succeed.
    console.error("ses-notifications: handling failed", { error: String(error) });
    return Response.json({ error: "Handling failed." }, { status: 500 });
  }

  // SNS expects a fast acknowledgement; Redis removal above is two small
  // commands, so this stays synchronous rather than queueing.
  return Response.json({ ok: true });
}

import { SESClient } from "@aws-sdk/client-ses";

/**
 * The one SES client.
 *
 * Server-only, same contract as `lib/redis.ts`: credentials come from the
 * environment, nothing under this module may be imported by a `"use client"`
 * module, and the client is constructed lazily so a build machine with no
 * credentials fails only the one send that needs it — not the whole build.
 *
 * One instance for the lifetime of the server process: the SDK client pools
 * HTTP connections, so a new client per send would redo the TLS handshake on
 * every email and double the credential surface.
 */
function create(): SESClient {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS_REGION, AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY. All three are required to send mail.",
    );
  }

  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

let instance: SESClient | null = null;

/** Lazily constructed, then reused for the lifetime of the server process. */
export function getSes(): SESClient {
  instance ??= create();
  return instance;
}

/** True when credentials are present. Lets a caller honestly skip sending. */
export function hasSes(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.SES_FROM_EMAIL,
  );
}

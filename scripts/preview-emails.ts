import { writeFileSync, mkdirSync } from "node:fs";
import { renderWelcome } from "../lib/email/welcome";
import { renderDailyDigest } from "../lib/email/daily-digest";
import { cacheStampedeSynchronizedTtl } from "../content/incidents/007-cache-stampede-synchronized-ttl";

const RECIPIENT = "reader@example.com";

mkdirSync(".preview", { recursive: true });
writeFileSync(".preview/welcome.html", renderWelcome(RECIPIENT).html);
writeFileSync(
  ".preview/daily-digest.html",
  renderDailyDigest(cacheStampedeSynchronizedTtl, RECIPIENT).html,
);
writeFileSync(".preview/welcome.txt", renderWelcome(RECIPIENT).text);
writeFileSync(
  ".preview/daily-digest.txt",
  renderDailyDigest(cacheStampedeSynchronizedTtl, RECIPIENT).text,
);
console.log("wrote .preview/welcome.html and .preview/daily-digest.html");

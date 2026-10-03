import { writeFileSync, mkdirSync } from "node:fs";
import { renderWelcome } from "../lib/email/welcome";
import { renderDailyDigest } from "../lib/email/daily-digest";
import { cacheStampedeSynchronizedTtl } from "../content/incidents/007-cache-stampede-synchronized-ttl";

mkdirSync(".preview", { recursive: true });
writeFileSync(".preview/welcome.html", renderWelcome().html);
writeFileSync(
  ".preview/daily-digest.html",
  renderDailyDigest(cacheStampedeSynchronizedTtl).html,
);
writeFileSync(".preview/welcome.txt", renderWelcome().text);
writeFileSync(
  ".preview/daily-digest.txt",
  renderDailyDigest(cacheStampedeSynchronizedTtl).text,
);
console.log("wrote .preview/welcome.html and .preview/daily-digest.html");

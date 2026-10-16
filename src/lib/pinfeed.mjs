// Pinterest RSS feed, Node side: file loaders plus the pure core in
// pinfeed-core.mjs (shared with the request-time Pages Function
// functions/pinfeed.xml.js). Read by the feed endpoint, the pin image build step,
// the refill script and the validators (pinterest-launch, pinterest-drip).
import fs from "node:fs";
import path from "node:path";
import { renderEntries } from "./pinfeed-core.mjs";

export * from "./pinfeed-core.mjs";

export function loadPinfeed(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, "data/pinterest/pinfeed.json"), "utf8"));
}

export const QUEUE_FILE = "data/pinterest/queue.json";
export function loadQueue(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, QUEUE_FILE), "utf8"));
}

// Launch-only rendering (kept for callers that want the 11 launch items alone).
export function renderPinfeed(feed) {
  return renderEntries(feed, feed.items.map((i) => ({
    guid: `approvalprep-pin-${i.slug}`, title: i.title, description: i.description,
    link: `https://approvalprep.com${i.path}?${feed.utm}`, image: `https://approvalprep.com/pins/${i.slug}.png`, pubDate: i.pubDate,
  })));
}

// Title wrap for the pin header: greedy, by character budget.
export function wrapTitle(text, maxChars = 20, maxLines = 4) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

// Pinterest RSS feed: one source for the feed endpoint, the pin image endpoint
// and the validator (scripts/validate/pinterest-launch.mjs).
import fs from "node:fs";
import path from "node:path";

export const SITE = "https://approvalprep.com";
export const FEED_PATH = "/pinfeed.xml";
export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500;

export function loadPinfeed(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, "data/pinterest/pinfeed.json"), "utf8"));
}

export const pinImagePath = (slug) => `/pins/${slug}.png`;
export const previewImagePath = (sku) => `/assets/products/${sku}.png`;

const esc = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

export function itemLink(feed, item) {
  return `${SITE}${item.path}?${feed.utm}`;
}

export function renderPinfeed(feed) {
  const items = feed.items.map((item) => {
    const link = itemLink(feed, item);
    const img = `${SITE}${pinImagePath(item.slug)}`;
    return `<item><title>${esc(item.title)}</title><link>${esc(link)}</link><guid isPermaLink="false">approvalprep-pin-${esc(item.slug)}</guid><pubDate>${new Date(item.pubDate).toUTCString()}</pubDate><description>${esc(item.description)}</description><enclosure url="${esc(img)}" length="0" type="image/png"/><media:content url="${esc(img)}" medium="image" type="image/png" width="${PIN_WIDTH}" height="${PIN_HEIGHT}"/></item>`;
  }).join("");
  const latest = feed.items.map((i) => new Date(i.pubDate).getTime()).reduce((a, b) => Math.max(a, b), 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(feed.channel.title)}</title><link>${SITE}/</link><description>${esc(feed.channel.description)}</description><language>en-us</language><lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate><atom:link href="${SITE}${FEED_PATH}" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`;
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

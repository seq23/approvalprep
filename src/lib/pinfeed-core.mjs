// Pinterest feed core: pure functions only (no node:fs), so the same code runs in
// the Astro build (src/pages/pinfeed.xml.ts), the request-time Pages Function
// (functions/pinfeed.xml.js), the refill script and the validators.
//
// Two sources:
//   data/pinterest/pinfeed.json - the 11 launch items (16 Oct 2026), unchanged.
//   data/pinterest/queue.json   - the daily drip: per-page pin VARIANTS, each with
//                                 its own releaseDate (YYYY-MM-DD, America/Chicago).
// The feed shows the launch items plus every variant whose releaseDate <= today in
// America/Chicago, newest first, at most config.MAX_FEED_ITEMS.

export const SITE = "https://approvalprep.com";
export const FEED_PATH = "/pinfeed.xml";
export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500;
export const TIMEZONE = "America/Chicago";
// A drip item's pubDate: its release day at 11:00 UTC (~06:00 CT).
export const RELEASE_HOUR_UTC = 11;

export const pinImagePath = (slugOrId) => `/pins/${slugOrId}.png`;
export const previewImagePath = (sku) => `/assets/products/${sku}.png`;

const esc = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

/** YYYY-MM-DD of `now` in America/Chicago. */
export function chicagoDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const variantPubDate = (releaseDate) => `${releaseDate}T${String(RELEASE_HOUR_UTC).padStart(2, "0")}:00:00Z`;

export function itemLink(feed, item) {
  return `${SITE}${item.path}?${feed.utm}`;
}

export function variantLink(feed, v) {
  return `${SITE}${v.path}?${feed.utm}&utm_content=${encodeURIComponent(v.id)}`;
}

/** Normalised feed entries (launch + released variants) due at `now`, newest first. */
export function dueEntries(feed, queue, now = new Date()) {
  const today = chicagoDate(now);
  const max = Number(queue?.config?.MAX_FEED_ITEMS ?? 50);
  const launch = (feed.items || []).map((i) => ({
    guid: `approvalprep-pin-${i.slug}`, title: i.title, description: i.description,
    link: itemLink(feed, i), image: `${SITE}${pinImagePath(i.slug)}`, pubDate: i.pubDate,
  }));
  const drip = (queue?.items || []).filter((v) => v.releaseDate <= today).map((v) => ({
    guid: `approvalprep-pin-${v.id}`, title: v.title, description: v.description,
    link: variantLink(feed, v), image: `${SITE}${pinImagePath(v.id)}`, pubDate: variantPubDate(v.releaseDate),
  }));
  return [...drip, ...launch]
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate) || (a.guid < b.guid ? -1 : 1))
    .slice(0, max);
}

export function renderEntries(feed, entries) {
  const items = entries.map((e) => `<item><title>${esc(e.title)}</title><link>${esc(e.link)}</link><guid isPermaLink="false">${esc(e.guid)}</guid><pubDate>${new Date(e.pubDate).toUTCString()}</pubDate><description>${esc(e.description)}</description><enclosure url="${esc(e.image)}" length="0" type="image/png"/><media:content url="${esc(e.image)}" medium="image" type="image/png" width="${PIN_WIDTH}" height="${PIN_HEIGHT}"/></item>`).join("");
  const latest = entries.map((e) => Date.parse(e.pubDate)).reduce((a, b) => Math.max(a, b), 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(feed.channel.title)}</title><link>${SITE}/</link><description>${esc(feed.channel.description)}</description><language>en-us</language><lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate><atom:link href="${SITE}${FEED_PATH}" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`;
}

/** The whole feed as served at `now`. */
export function renderFeedAt(feed, queue, now = new Date()) {
  return renderEntries(feed, dueEntries(feed, queue, now));
}

/** Unreleased variants at `now` (releaseDate > today, America/Chicago). */
export function unreleasedCount(queue, now = new Date()) {
  const today = chicagoDate(now);
  return (queue?.items || []).filter((v) => v.releaseDate > today).length;
}

export function needsRefill(queue, now = new Date()) {
  return unreleasedCount(queue, now) < Number(queue?.config?.REFILL_THRESHOLD ?? 14);
}

/**
 * Release dates for `variants` (each with .slug), PINS_PER_DAY a day starting at
 * `startDate`, never the same page on two consecutive days and never twice in a
 * day. `prevDaySlugs` are the pages released on the day before startDate. Greedy:
 * each day takes the pages with the most variants left, skipping yesterday's.
 * Returns a new array in release order.
 */
export function scheduleVariants(variants, { startDate, perDay = 1, prevDaySlugs = [] }) {
  const byPage = new Map();
  for (const v of variants) {
    if (!byPage.has(v.slug)) byPage.set(v.slug, []);
    byPage.get(v.slug).push(v);
  }
  const order = [...byPage.keys()];
  const out = [];
  let yesterday = new Set(prevDaySlugs);
  let day = startDate;
  while ([...byPage.values()].some((l) => l.length)) {
    const candidates = order
      .filter((s) => byPage.get(s).length && !yesterday.has(s))
      .sort((a, b) => byPage.get(b).length - byPage.get(a).length || order.indexOf(a) - order.indexOf(b));
    if (!candidates.length) throw new Error(`scheduleVariants: cannot place a variant on ${day} without repeating a page from the day before (pages left: ${order.filter((s) => byPage.get(s).length).join(", ")})`);
    const picked = candidates.slice(0, perDay);
    for (const s of picked) out.push({ ...byPage.get(s).shift(), releaseDate: day });
    yesterday = new Set(picked);
    day = addDays(day, 1);
  }
  return out;
}

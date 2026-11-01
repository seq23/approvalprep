#!/usr/bin/env node
/**
 * THE SPRY LABS WEEKLY HAND-OFF for ApprovalPrep (owner, 1 Nov 2026). This repo sends no weekly
 * email. On Wednesday morning it writes spry-weekly-summary.json (schema spry-weekly-summary-v1) and
 * .github/workflows/spry-weekly-summary.yml uploads it as the artifact `spry-weekly-summary`. Boss OS
 * reads the newest one at 08:15 Central and puts one short section for ApprovalPrep into the one
 * "Spry Labs weekly" email.
 *
 * Four real numbers, each from something this repo already records:
 *   1. Sales: paid downloads (D1 download_entitlements, written by the Stripe webhook) and checkouts
 *      started (D1 conversion_events `checkout_start`), last 7 days.
 *   2. Search: Google Search Console clicks and impressions, data/search_intelligence/gsc_truth.json
 *      (the rolling 28-day window the daily collector keeps).
 *   3. Pinterest: new pins, visits from pins, checkouts and sales by pin visitors,
 *      data/pinterest/metrics.json (Saturday's pinterest-metrics run).
 *   4. Pages: new pages published in the last 7 days (data/cadence/known_urls.json history) and the
 *      pages waiting in the refresh queue (data/intelligence/page_refresh_queue.json).
 *
 * RULE 0: a number that could not be read is the line "<what>: not read: <reason>", never a zero.
 * If not one of the four could be read the script refuses (NAMED STOP), so Boss OS says the report
 * did not arrive instead of carrying four empty lines.
 *
 *   node scripts/spry/spry-weekly-summary.mjs [out.json]      # needs CLOUDFLARE_API_TOKEN/ACCOUNT_ID for sales
 *   node scripts/spry/spry-weekly-summary.mjs --self-check
 */
import fs from "node:fs";

export const SCHEMA = "spry-weekly-summary-v1";
export const HOST = "approvalprep.com";
const DAY = 86_400_000;
const STALE_SEARCH_DAYS = 8;
const STALE_PINTEREST_DAYS = 10;

const day = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" });
const plural = (k, one, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const notRead = (what, reason) => ({ read: false, line: `${what}: not read: ${reason}.` });

/** Sales line from `{ paid, checkouts, pageViews }` or `{ error }`. */
export function salesLine(sales) {
  if (!sales || sales.error) return notRead("Sales", sales?.error ?? "nothing was asked");
  // The money line (Growth playbook build order 1): count AND revenue, never a buyer's name.
  const paid = `${plural(sales.paid, "paid download")} this week${sales.cents == null ? "" : ` ($${(Number(sales.cents) / 100).toFixed(2)})`}`;
  // A checkout count of 0 from a tracker that logged no page views is not a measurement.
  const checkouts = sales.pageViews > 0 ? `, ${plural(sales.checkouts, "checkout")} started` : " (checkouts not read: the page-view tracker logged nothing this week)";
  return { read: true, line: `Sales: ${paid}${checkouts}.` };
}

/** Search line from gsc_truth.json. */
export function searchLine(gsc, now) {
  if (!gsc) return notRead("Search", "no Search Console record in this repo");
  const status = gsc.collection?.status;
  if (status !== "COLLECTED") return notRead("Search", `the last Search Console collection was ${String(status ?? "unknown").toLowerCase()}`);
  const at = Date.parse(gsc.collection?.source_fetched_at ?? gsc.collected_on ?? "");
  if (Number.isNaN(at)) return notRead("Search", "the Search Console record carries no date");
  if (now - at > STALE_SEARCH_DAYS * DAY) return notRead("Search", `the newest Search Console record is from ${day(at)}`);
  const t = gsc.totals ?? {};
  if (t.window_clicks == null || t.window_impressions == null) return notRead("Search", "the Search Console record has no totals");
  return { read: true, line: `Search (Google, 28 days to ${day(gsc.window?.end_date ? `${gsc.window.end_date}T12:00:00Z` : at)}): ${plural(t.window_clicks, "click")}, shown in results ${t.window_impressions === 1 ? "once" : `${t.window_impressions} times`}.` };
}

/** Pinterest line from data/pinterest/metrics.json. */
export function pinterestLine(pin, now) {
  if (!pin) return notRead("Pinterest", "no Pinterest measurement in this repo");
  if (pin.state !== "MEASURED") return notRead("Pinterest", String(pin.reason ?? pin.stop ?? "the last measurement stopped").replace(/\.$/, ""));
  const w = (pin.weeks ?? [])[0];
  if (!w) return notRead("Pinterest", "the measurement holds no week");
  const at = Date.parse(pin.updatedAt ?? `${w.weekEnding}T12:00:00Z`);
  if (now - at > STALE_PINTEREST_DAYS * DAY) return notRead("Pinterest", `the newest measurement is from ${day(at)}`);
  const pins = w.pinsReleased != null ? `${plural(w.pinsReleased, "new pin")}, ` : "";
  const sales = w.pinCheckouts != null && w.pinSales != null ? `; ${plural(w.pinCheckouts, "checkout")} started and ${plural(w.pinSales, "sale")} from pin visitors` : "";
  return { read: true, line: `Pinterest (week to ${day(`${w.weekEnding}T12:00:00Z`)}): ${pins}${plural(w.pinterestViews, "visit")} from pins, of ${plural(w.allPageViews, "page view")} in all${sales}.` };
}

/** Pages line from known_urls.json history and the refresh queue. */
export function pagesLine(known, queue, now) {
  if (!known || !Array.isArray(known.history)) return notRead("Pages", "the publishing ledger has no history");
  const since = new Date(now - 7 * DAY).toISOString().slice(0, 10);
  const days = known.history.filter((h) => String(h.date) > since);
  if (!days.length) return notRead("Pages", "the publishing ledger has no entry from the last 7 days");
  const added = days.reduce((a, h) => a + Number(h.added ?? 0), 0);
  const waiting = Array.isArray(queue?.items) ? `; ${plural(queue.items.length, "page")} waiting in the refresh queue` : "; refresh queue not read";
  return { read: true, line: `Pages: ${plural(added, "new page")} published this week${waiting}.` };
}

/** The summary Boss OS reads. Throws NAMED STOP when nothing at all was read. */
export function buildSummary({ sales, gsc, pin, known, queue, now = Date.now(), runUrl = null }) {
  const lines = [salesLine(sales), searchLine(gsc, now), pinterestLine(pin, now), pagesLine(known, queue, now)];
  const read = lines.filter((l) => l.read).length;
  if (read === 0) throw new Error("NAMED STOP [NOTHING_READ] not one of sales, search, Pinterest or pages could be read; nothing to hand to Boss OS.");
  const missing = lines.length - read;
  return {
    schema: SCHEMA, business: "ApprovalPrep", week: new Date(now).toISOString().slice(0, 10),
    generated_at: new Date(now).toISOString(), run_url: runUrl,
    sites: [{ host: HOST, label: HOST, state: missing ? "watch" : "fine", why: missing ? [`${plural(missing, "number")} could not be read this week`] : [] }],
    notes: lines.map((l) => l.line),
  };
}

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);

/** Sales from D1 through the Cloudflare D1 query API; `{ error }` when it cannot be read. */
async function readSales(now) {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  if (!token || !account) return { error: "the Cloudflare credentials are not set for this run" };
  const id = /database_name = "approvalprep-products"\s*\ndatabase_id = "([^"]+)"/.exec(fs.readFileSync("wrangler.toml", "utf8"))?.[1];
  if (!id) return { error: "wrangler.toml names no approvalprep-products database" };
  const since = new Date(now - 7 * DAY).toISOString();
  const q = async (sql) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${id}/query`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql, params: [since] }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) throw new Error(`the database answered ${res.status}`);
    return Number(body.result?.[0]?.results?.[0]?.n ?? 0);
  };
  try {
    return {
      paid: await q("SELECT COUNT(*) AS n FROM download_entitlements WHERE payment_status = 'paid' AND revoked_at IS NULL AND created_at >= ?"),
      cents: await q("SELECT COALESCE(SUM(amount_total), 0) AS n FROM download_entitlements WHERE payment_status = 'paid' AND revoked_at IS NULL AND created_at >= ?"),
      checkouts: await q("SELECT COUNT(*) AS n FROM conversion_events WHERE event = 'checkout_start' AND created_at >= ?"),
      pageViews: await q("SELECT COUNT(*) AS n FROM conversion_events WHERE event = 'page_view' AND created_at >= ?"),
    };
  } catch (e) {
    return { error: String(e?.message ?? e) };
  }
}

/** Proves the hand-off before CI trusts it: numbers read become lines, unread ones say so, none refuses. */
export function selfCheck() {
  const now = Date.parse("2026-11-04T13:00:00Z");
  const full = buildSummary({
    now,
    sales: { paid: 2, checkouts: 5, pageViews: 40 },
    gsc: { collection: { status: "COLLECTED", source_fetched_at: "2026-11-04T09:00:00Z" }, window: { end_date: "2026-11-04" }, totals: { window_clicks: 3, window_impressions: 40 } },
    pin: { state: "MEASURED", updatedAt: "2026-10-31T11:00:00Z", weeks: [{ weekEnding: "2026-10-31", pinterestViews: 1, allPageViews: 26, pinsReleased: 21, pinCheckouts: 1, pinSales: 0 }] },
    known: { history: [{ date: "2026-11-02", added: 1 }, { date: "2026-10-20", added: 9 }] },
    queue: { items: [{}, {}] },
  });
  const want = ["Sales: 2 paid downloads this week, 5 checkouts started.", "Search (Google, 28 days to Nov 4): 3 clicks, shown in results 40 times.", "Pinterest (week to Oct 31): 21 new pins, 1 visit from pins, of 26 page views in all; 1 checkout started and 0 sales from pin visitors.", "Pages: 1 new page published this week; 2 pages waiting in the refresh queue."];
  if (full.schema !== SCHEMA || JSON.stringify(full.notes) !== JSON.stringify(want) || full.sites[0].state !== "fine") throw new Error(`self-check: lines are wrong: ${JSON.stringify(full.notes)}`);
  const part = buildSummary({ now, sales: { error: "the Cloudflare credentials are not set for this run" }, gsc: null, pin: { state: "NAMED_STOP", reason: "D1 read failed." }, known: { history: [{ date: "2026-11-03", added: 0 }] }, queue: null });
  if (!part.notes[0].includes("not read") || !part.notes[2].startsWith("Pinterest: not read: D1 read failed") || part.notes.some((l) => /\b0 (paid|click|visit)/.test(l)) || part.sites[0].state !== "watch") throw new Error(`self-check: an unread number became a zero or vanished: ${JSON.stringify(part.notes)}`);
  if (!salesLine({ paid: 1, cents: 1500, checkouts: 2, pageViews: 9 }).line.startsWith("Sales: 1 paid download this week ($15.00)")) throw new Error("self-check: the money line lost its revenue");
  let refused = false;
  try { buildSummary({ now, sales: { error: "x" }, gsc: null, pin: null, known: null, queue: null }); } catch { refused = true; }
  if (!refused) throw new Error("self-check: a summary with nothing read was handed on (rule 0)");
  console.log("spry-weekly-summary self-check: ok");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] === "--self-check") selfCheck();
  else {
    const out = process.argv[2] ?? "spry-weekly-summary.json";
    const now = Date.now();
    const summary = buildSummary({
      now, runUrl: process.env.RUN_URL ?? null, sales: await readSales(now),
      gsc: readJson("data/search_intelligence/gsc_truth.json"), pin: readJson("data/pinterest/metrics.json"),
      known: readJson("data/cadence/known_urls.json"), queue: readJson("data/intelligence/page_refresh_queue.json"),
    });
    fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
    for (const l of summary.notes) console.log(`  ${l}`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Spry Labs weekly: ApprovalPrep\n\n${summary.notes.map((l) => `- ${l}`).join("\n")}\n`);
    console.log(`spry weekly summary -> ${out}`);
  }
}

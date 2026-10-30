#!/usr/bin/env node
// The weekly check that the entity's outside profiles are still real
// (authority audit, 30 Oct 2026; .github/workflows/entity-backlink-watch.yml).
//
// schema-entity-graph proves every page publishes src/data/entity.json. Nothing
// proved entity.json still tells the truth: a profile can be deleted, renamed or
// lose its link back to the site without any commit here, and a sameAs pointing
// at a 404 is worse than none. This fetches every profile and acts:
//   - sameAs that answers 404/410 (twice): DEAD. With --apply it leaves sameAs
//     and returns to profiles_pending with a dated note, so it can come back.
//   - pending profile that answers 2xx AND names approvalprep.com: PROMOTED into
//     sameAs with --apply. Both conditions, so a stranger taking the same slug
//     is never adopted.
//   - sameAs that resolves but whose page does not name approvalprep.com, on a
//     platform that renders server-side: the named stop LINK_BACK_MISSING, with
//     the exact profile field to edit (the owner's login).
//   - a JS-rendered platform (Instagram, Gumroad, Google Maps, TikTok, X) or a
//     platform that refuses robots (401/403/429/999): UNVERIFIABLE, a named state,
//     never counted as a pass and never removed.
// A network error is retried once and then recorded as UNVERIFIABLE: one bad
// week of DNS never deletes a profile.
//
// Rule 0: exits 1 when entity.json lists zero profiles to check. Exits 0
// otherwise, with every finding and named stop printed and written to
// --report (and the step summary in Actions).
//
// Usage: node scripts/ops/entity-backlink-watch.mjs [--apply] [--report file] [--fixture file]
//   --fixture  a JSON map {url: {status, body}} used instead of the network
//              (the negative proofs in validate:entity-backlink-watch).
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ENTITY_FILE = process.env.ENTITY_FILE || "src/data/entity.json";
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const arg = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const APPLY = flag("--apply");
const REPORT = arg("--report");
const FIXTURE = arg("--fixture") ? JSON.parse(fs.readFileSync(arg("--fixture"), "utf8")) : null;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 20000;
const today = new Date().toISOString().slice(0, 10);

const entityPath = path.resolve(root, ENTITY_FILE);
const entity = JSON.parse(fs.readFileSync(entityPath, "utf8"));
const OWN_HOST = new URL(entity.url).hostname.replace(/^www\./, "");

const JS_RENDERED = [/(^|\.)instagram\.com$/, /(^|\.)gumroad\.com$/, /(^|\.)tiktok\.com$/, /(^|\.)x\.com$/, /(^|\.)twitter\.com$/, /^maps\.google\./, /^g\.page$/, /^goo\.gl$/];
const isJsRendered = (url) => {
  const u = new URL(url);
  return JS_RENDERED.some((re) => re.test(u.hostname)) || (/(^|\.)google\.com$/.test(u.hostname) && u.pathname.startsWith("/maps"));
};
// Where the owner edits the link back, per platform.
const FIELD = [
  [/pinterest\./, "Pinterest: Settings > Edit profile > Website, then Settings > Claimed accounts > claim approvalprep.com"],
  [/facebook\.com$/, "Facebook Page: Edit Page > Contact info > Website"],
  [/youtube\.com$/, "YouTube Studio: Customization > Basic info > Links"],
  [/github\.com$/, "GitHub: profile or organization Settings > URL"],
  [/linkedin\.com$/, "LinkedIn company page: Edit page > Page info > Website URL"]
];
const fieldFor = (url) => (FIELD.find(([re]) => re.test(new URL(url).hostname)) || [null, "the profile's website / link field"])[1];

async function fetchOnce(url) {
  if (FIXTURE) {
    const hit = FIXTURE[url];
    if (!hit) throw new Error("fixture has no entry");
    return { status: hit.status, body: hit.body || "" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: controller.signal });
    const body = response.ok ? await response.text() : "";
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

// One retry on a network error, a 5xx, or a 404/410 - a profile is only dead
// when it says so twice.
async function probe(url) {
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      last = await fetchOnce(url);
      if (last.status < 500 && last.status !== 404 && last.status !== 410) return last;
    } catch (error) {
      last = { status: 0, body: "", error: String(error.message || error) };
    }
  }
  return last;
}

function classify(url, result) {
  const { status, body } = result;
  if (status === 404 || status === 410) return { state: "DEAD", status };
  if (status >= 200 && status < 300) {
    if (isJsRendered(url)) return { state: "UNVERIFIABLE", status, why: "JS-rendered platform; the link back cannot be read server-side" };
    const linksBack = body.toLowerCase().includes(OWN_HOST);
    return { state: linksBack ? "OK" : "LINK_BACK_MISSING", status };
  }
  return { state: "UNVERIFIABLE", status, why: status === 0 ? `network error (${result.error})` : `HTTP ${status}: the platform refuses automated reads` };
}

const sameAs = Array.isArray(entity.sameAs) ? entity.sameAs : [];
const pending = Array.isArray(entity.profiles_pending) ? entity.profiles_pending : [];
if (sameAs.length + pending.length === 0) {
  console.error(`[entity-backlink-watch] FAIL: ${ENTITY_FILE} lists zero profiles (sameAs and profiles_pending both empty); nothing was checked`);
  process.exit(1);
}

const rows = [];
for (const url of sameAs) rows.push({ list: "sameAs", url, ...classify(url, await probe(url)) });
for (const profile of pending) {
  const row = { list: "profiles_pending", url: profile.url, platform: profile.platform, ...classify(profile.url, await probe(profile.url)) };
  // A pending profile that 404s has simply not been created yet.
  if (row.state === "DEAD") row.state = "NOT_YET_LIVE";
  rows.push(row);
}

const changes = [];
const stops = [];
const nextSameAs = [];
const nextPending = [];
for (const row of rows.filter((r) => r.list === "sameAs")) {
  if (row.state === "DEAD") {
    changes.push(`removed ${row.url} from sameAs: HTTP ${row.status} twice on ${today}`);
    nextPending.push({ platform: new URL(row.url).hostname, url: row.url, owner_action: `Removed from sameAs by the weekly watch on ${today} (HTTP ${row.status}). Restore the profile and the watch promotes it back once it answers 200 and names ${OWN_HOST}.` });
  } else {
    nextSameAs.push(row.url);
    if (row.state === "LINK_BACK_MISSING") stops.push(`NAMED STOP LINK_BACK_MISSING ${row.url}: the profile resolves but does not name ${OWN_HOST}. Edit: ${fieldFor(row.url)} = https://${OWN_HOST}/`);
  }
}
for (const profile of pending) {
  const row = rows.find((r) => r.list === "profiles_pending" && r.url === profile.url);
  if (row.state === "OK" && !nextSameAs.includes(profile.url)) {
    changes.push(`promoted ${profile.url} from profiles_pending into sameAs: HTTP ${row.status} and names ${OWN_HOST} on ${today}`);
    nextSameAs.push(profile.url);
  } else {
    nextPending.push(profile);
    if (row.state === "NOT_YET_LIVE" || row.state === "LINK_BACK_MISSING") stops.push(`NAMED STOP PROFILE_PENDING ${profile.url} (${row.state}): ${profile.owner_action || "claim this profile and link it to " + OWN_HOST}`);
  }
}

const lines = rows.map((r) => `${r.state.padEnd(17)} ${r.list.padEnd(16)} ${r.url}${r.status !== undefined ? ` (HTTP ${r.status})` : ""}${r.why ? ` - ${r.why}` : ""}`);
const report = { checkedAt: new Date().toISOString(), entity: entity["@id"], applied: APPLY, rows, changes, namedStops: stops };

if (APPLY && changes.length) {
  entity.sameAs = nextSameAs;
  entity.profiles_pending = nextPending;
  fs.writeFileSync(entityPath, JSON.stringify(entity, null, 2) + "\n");
}
if (REPORT) { fs.mkdirSync(path.dirname(REPORT), { recursive: true }); fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n"); }
const summary = [
  `## Entity backlink watch (${entity["@id"]})`,
  "", "```", ...lines, "```", "",
  changes.length ? `Changes${APPLY ? " applied" : " (dry run)"}:\n${changes.map((c) => `- ${c}`).join("\n")}` : "No sameAs change.",
  stops.length ? `\n${stops.map((s) => `- ${s}`).join("\n")}` : ""
].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
console.log(lines.join("\n"));
for (const c of changes) console.log(`[entity-backlink-watch] ${APPLY ? "APPLIED" : "WOULD"} ${c}`);
for (const s of stops) console.log(`[entity-backlink-watch] ${s}`);
const count = (state) => rows.filter((r) => r.state === state).length;
console.log(`[entity-backlink-watch] checked=${rows.length} ok=${count("OK")} unverifiable=${count("UNVERIFIABLE")} dead=${count("DEAD")} pending_not_live=${count("NOT_YET_LIVE")} link_back_missing=${count("LINK_BACK_MISSING")} changes=${changes.length} named_stops=${stops.length}`);

#!/usr/bin/env node
// Host redirects at Cloudflare's edge, so pages need no Function in front of them.
//
// The root middleware used to send www.approvalprep.com and the two parked domains to the
// canonical host. With public/_routes.json, pages no longer pass through a Function, so the same
// redirects live as zone Redirect Rules (free). This script creates or updates them and is safe
// to run again: it only touches rules whose description starts with "approvalprep-host:".
//
//   dry run (default, read-only):  CLOUDFLARE_API_TOKEN=... node scripts/ops/cloudflare-host-redirects.mjs
//   apply:                         CLOUDFLARE_API_TOKEN=... node scripts/ops/cloudflare-host-redirects.mjs --apply
//
// The token needs Zone:Read and Zone "Single Redirect / Dynamic Redirect" edit on the three zones.
const token = process.env.CLOUDFLARE_API_TOKEN;
const apply = process.argv.includes("--apply");
if (!token) { console.error("NAMED STOP [CLOUDFLARE_TOKEN_MISSING] set CLOUDFLARE_API_TOKEN"); process.exit(2); }
const TAG = "approvalprep-host:";
const GET_ONLY = 'http.request.method in {"GET" "HEAD"}';
const zones = {
  "approvalprep.com": [{ description: `${TAG} www to apex`, expression: `(http.host eq "www.approvalprep.com" and ${GET_ONLY})`, target: { expression: 'concat("https://approvalprep.com", http.request.uri.path)' } }],
  "letterofexplanation.com": [{ description: `${TAG} parked domain`, expression: `(http.host in {"letterofexplanation.com" "www.letterofexplanation.com"} and ${GET_ONLY})`, target: { value: "https://approvalprep.com/letter-of-explanation/" }, dropQuery: true }],
  "employmentverificationletter.com": [{ description: `${TAG} parked domain`, expression: `(http.host in {"employmentverificationletter.com" "www.employmentverificationletter.com"} and ${GET_ONLY})`, target: { value: "https://approvalprep.com/employment-verification-letter/" }, dropQuery: true }]
};
const api = async (path, init = {}) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};
let failed = 0, done = 0;
for (const [zoneName, wanted] of Object.entries(zones)) {
  const zone = (await api(`/zones?name=${zoneName}`)).body?.result?.[0];
  if (!zone) { console.error(`NAMED STOP [ZONE_NOT_VISIBLE] ${zoneName}: this token cannot see the zone`); failed++; continue; }
  const entry = `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  const current = await api(entry);
  if (current.status !== 200 && current.status !== 404) { console.error(`NAMED STOP [RULESET_READ_REFUSED] ${zoneName}: HTTP ${current.status}`); failed++; continue; }
  const existing = current.body?.result?.rules || [];
  const kept = existing.filter((r) => !String(r.description || "").startsWith(TAG)).map(({ id, version, last_updated, ref, ...rule }) => rule);
  const ours = wanted.map((w) => ({ description: w.description, expression: w.expression, enabled: true, action: "redirect", action_parameters: { from_value: { status_code: 301, target_url: w.target, preserve_query_string: !w.dropQuery } } }));
  const had = existing.filter((r) => String(r.description || "").startsWith(TAG)).length;
  console.log(`${zoneName}: ${existing.length} redirect rule(s) now, ${had} of ours; ${apply ? "writing" : "would write"} ${ours.length} (other rules kept: ${kept.length})`);
  if (!apply) { done++; continue; }
  const put = await api(entry, { method: "PUT", body: JSON.stringify({ rules: [...ours, ...kept] }) });
  if (put.status !== 200) { console.error(`NAMED STOP [RULESET_WRITE_REFUSED] ${zoneName}: HTTP ${put.status} ${JSON.stringify(put.body?.errors || []).slice(0, 300)}`); failed++; } else done++;
}
console.log(`OUTPUT host-redirects mode=${apply ? "apply" : "dry-run"} zones_ok=${done} zones_failed=${failed}`);
process.exit(failed ? 1 : 0);

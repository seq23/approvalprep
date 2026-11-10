#!/usr/bin/env node
// validate:medium-lane (restored 10 Nov 2026, hostile review: items 1, 2 and 5) - the medium-risk
// answer lane's gate and self-heal (scripts/lib/medium_lane.mjs), proved on fixtures, plus the
// published medium pages in data/content/generated_answers.json re-gated against today's
// registries. Hard-fails when:
//   1. a gate lets through a regulated route, an unsourced / non-primary / non-allowlisted /
//      stale / edited claim, an uncited number or fee, an approval promise, or a missing disclaimer;
//   2. self-heal does not repair a repairable page (bad source, invented fee, promise, dropped
//      disclaimer), or does repair an unrepairable one;
//   5. a published medium page fails the gate now, or a regulated/high page is published by contract.
import fs from "node:fs";
import {
  MAX_HEAL_ATTEMPTS, MEDIUM_DISCLAIMER,
  rankMediumTargets, buildMediumCandidate, gateMediumCandidate, healMediumCandidate,
} from "../lib/medium_lane.mjs";
import { isAnswerableRoute } from "../content/answer-eligibility.mjs";

const errors = [];
const fail = (m) => errors.push(m);
const expect = (cond, m) => { if (!cond) fail(m); };
let checks = 0;
const check = (cond, m) => { checks += 1; expect(cond, m); };

const allowlist = ["consumerfinance.gov", ".gov"];
const asOf = "2026-10-27T12:00:00.000Z";
const sources = [
  { source_id: "gov_primary", source_name: "Agency page", url: "https://www.example.gov/page", authority_class: "primary" },
  { source_id: "mil_primary", source_name: "Not allowlisted", url: "https://www.example.mil/page", authority_class: "primary" },
  { source_id: "blog_secondary", source_name: "A blog", url: "https://blog.example.com/x", authority_class: "secondary" },
];
const claims = [
  { claim_id: "c_ok", claim_text: "Verification fields vary by requester.", risk_class: "medium", page_route: "/m-one", source_ids: ["gov_primary", "mil_primary"], freshness_class: "annual_review", last_verified_at: "2026-07-30", status: "active" },
  { claim_id: "c_blog_only", claim_text: "A blog says something.", risk_class: "medium", page_route: "/m-two", source_ids: ["blog_secondary"], freshness_class: "annual_review", last_verified_at: "2026-07-30", status: "active" },
  { claim_id: "c_m3", claim_text: "Lenders may ask for bank statements.", risk_class: "medium", page_route: "/m-three", source_ids: ["gov_primary"], freshness_class: "annual_review", last_verified_at: "2026-07-30", status: "active" },
  { claim_id: "c_reg", claim_text: "Regulated statement.", risk_class: "regulated", page_route: "/r-one", source_ids: ["gov_primary"], freshness_class: "annual_review", last_verified_at: "2026-07-30", status: "active" },
];
const manifest = { routes: [
  { path: "/m-one", title: "M One", type: "public", index: true, risk: "medium", page_intent: "guide" },
  { path: "/m-two", title: "M Two", type: "public", index: true, risk: "medium", page_intent: "guide" },
  { path: "/m-three", title: "M Three", type: "public", index: true, risk: "medium", page_intent: "guide" },
  { path: "/r-one", title: "R One", type: "public", index: true, risk: "regulated", page_intent: "guide" },
  { path: "/h-one", title: "H One", type: "public", index: true, risk: "high", page_intent: "guide" },
] };
const route = (p) => manifest.routes.find((r) => r.path === p);
const tgt = (query, path, value) => ({ query, expected_owned_route: path, source: "gsc_search_analytics", measurement: { metric: "impressions_28d", value } });
const targets = [
  tgt("m one question", "/m-one", 5), tgt("m two question", "/m-two", 50), tgt("m three question", "/m-three", 3),
  tgt("m one second question", "/m-one", 4), tgt("regulated question", "/r-one", 900), tgt("high question", "/h-one", 800),
  tgt("M One", "/m-one", 10000), tgt("unmeasured", "/m-one", 0),
];

// Fixture targets come from the real ranking (its own checks were cut 10 Nov 2026).
const ranked = rankMediumTargets({ targets, manifest, isAnswerable: isAnswerableRoute });

const ctxFor = (target) => ({ route: route(target.route), target, allowlist, asOf, registeredClaims: claims });
const build = (target, copy = {}) => buildMediumCandidate({ target, route: route(target.route), routeCopy: copy, claims, sources, releaseDate: "2026-10-27", releaseId: "content-release-2026-10-27" });
const t1 = ranked.find((t) => t.route === "/m-one");
const t3 = ranked.find((t) => t.route === "/m-three");

// 1. gates, each proved failing on a broken page.
const clean = build(t3);
check(gateMediumCandidate(clean, ctxFor(t3)).ok, `a clean medium page failed its gate: ${gateMediumCandidate(clean, ctxFor(t3)).failures}`);
const has = (c, ctx, code) => gateMediumCandidate(c, ctx).failures.some((f) => f.startsWith(code));
check(has(build(t1), ctxFor(t1), "source_domain_not_allowlisted"), "gate passed a source on a non-allowlisted domain");
const t2 = ranked.find((t) => t.route === "/m-two");
check(has(build(t2), ctxFor(t2), "source_not_primary"), "gate passed a non-primary source");
check(has({ ...clean, steps: [...clean.steps, "Expect a $75 fee within 10 days."] }, ctxFor(t3), "uncited_number"), "gate passed an invented fee/number");
check(has({ ...clean, checklist: [...clean.checklist, "This letter means you will be approved."] }, ctxFor(t3), "approval_promise"), "gate passed an approval promise");
check(has({ ...clean, boundary: "" }, ctxFor(t3), "disclaimer_missing"), "gate passed a page without the disclaimer");
check(has({ ...clean, citations: [] }, ctxFor(t3), "no_cited_claim"), "gate passed a page with no cited claim");
check(has({ ...clean, citations: [{ ...clean.citations[0], lastVerifiedAt: "2024-01-01" }] }, ctxFor(t3), "claim_stale"), "gate passed a stale claim");
check(has({ ...clean, citations: [{ ...clean.citations[0], claimText: "Edited claim." }] }, ctxFor(t3), "claim_inconsistent"), "gate passed a claim that differs from the registry");
const regTarget = { query: "regulated question", route: "/r-one", risk: "regulated", source: "x", metric: "m", value: 1 };
check(has(buildMediumCandidate({ target: regTarget, route: route("/r-one"), claims, sources, releaseDate: "2026-10-27", releaseId: "x" }), ctxFor(regTarget), "risk_closed"), "gate passed a regulated route");

// 2. self-heal: a page broken four ways is repaired and passes; the failing case is shown.
const broken = { ...build(t1), boundary: "", steps: [...build(t1).steps, "Expect a $75 fee within 10 days."], checklist: [...build(t1).checklist, "You will be approved if you follow this."] };
const before = gateMediumCandidate(broken, ctxFor(t1));
const healed = healMediumCandidate(broken, ctxFor(t1));
check(!before.ok && ["source_domain_not_allowlisted", "uncited_number", "approval_promise", "disclaimer_missing"].every((c) => before.failures.some((f) => f.startsWith(c))), `the broken fixture did not fail all four gates first: ${before.failures}`);
check(healed.ok, `self-heal did not repair a repairable page: ${healed.failures}`);
check(healed.attempts >= 1 && healed.attempts <= MAX_HEAL_ATTEMPTS, `self-heal attempts out of bounds: ${healed.attempts}`);
check(healed.candidate.citations[0].sources.map((s) => s.sourceId).join() === "gov_primary", "self-heal did not re-source the claim to its allowlisted primary source");
check(!JSON.stringify(healed.candidate).includes("$75") && !/will be approved/i.test(healed.candidate.checklist.join(" ")), "self-heal left the invented fee or the promise on the page");
check(healed.candidate.boundary === MEDIUM_DISCLAIMER, "self-heal did not reattach the disclaimer");
check(!healMediumCandidate(build(t2), ctxFor(t2)).ok, "self-heal 'repaired' a page whose only claim has no primary source");

// 5. the real corpus.
const real = JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8")).answers || [];
const realManifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const realClaims = JSON.parse(fs.readFileSync("data/citations/claim_registry.json", "utf8")).claims;
const realAllow = JSON.parse(fs.readFileSync("data/citations/source_domain_allowlist.json", "utf8")).domains;
let realMedium = 0;
for (const a of real.filter((x) => x.status === "published_by_contract")) {
  if (a.riskLevel === "regulated" || a.riskLevel === "high") fail(`${a.id} is a ${a.riskLevel} page published by contract`);
  if (a.riskLevel !== "medium") continue;
  realMedium += 1;
  const r = realManifest.routes.find((x) => x.path === a.route);
  const g = gateMediumCandidate(a, { route: r, target: a.measuredQuery, allowlist: realAllow, asOf: a.gate?.gatedAt || a.publishedAt, registeredClaims: realClaims });
  if (!g.ok) fail(`published medium page ${a.id} fails its gate: ${g.failures.join(",")}`);
}

if (checks < 17) fail(`only ${checks} fixture checks ran`);
if (!real.length) fail("data/content/generated_answers.json holds no answers; the corpus re-gate read nothing");
if (errors.length) { console.error(`[medium-lane] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[medium-lane] OK fixtureChecks=${checks} healedFailures=${before.failures.length} healAttempts=${healed.attempts} publishedMediumPages=${realMedium}`);

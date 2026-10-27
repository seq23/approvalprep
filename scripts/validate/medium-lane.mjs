#!/usr/bin/env node
// validate:medium-lane - the medium-risk answer lane's gates, self-heal,
// cadence, measurement and rotation (scripts/lib/medium_lane.mjs), proved on
// fixtures, plus the published medium pages in data/content/generated_answers.json
// re-gated against today's registries. The real generator is exercised in
// validate:content-release. Hard-fails when:
//   1. a gate lets through a regulated route, an unsourced / non-primary /
//      non-allowlisted / stale claim, an uncited number or fee, an approval
//      promise, a missing disclaimer, or a title that is not the measured query;
//   2. self-heal does not repair a repairable page (bad source, invented fee,
//      promise, dropped disclaimer), or does repair an unrepairable one;
//   3. the lane does not skip an unhealable route and move to the next one, or
//      exceeds the cap / one-page-per-route rule, or ranks against demand;
//   4. a page with no impressions after the window is not rotated, a page with
//      impressions or one still inside the window (or judged by a stale import)
//      is, or the named stop does not clear when its condition is fixed;
//   5. a published medium page fails the gate now, or a regulated/high page is
//      published by contract.
import fs from "node:fs";
import {
  MEDIUM_LANE_CAP_PER_RELEASE, MAX_HEAL_ATTEMPTS, NO_IMPRESSION_WINDOW_DAYS, MEDIUM_STOP, MEDIUM_DISCLAIMER,
  rankMediumTargets, buildMediumCandidate, gateMediumCandidate, healMediumCandidate, runMediumLane,
  measureMediumPages, rotatedRoutes,
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

// 3. ranking: medium only, head term and unmeasured excluded, demand order.
const ranked = rankMediumTargets({ targets, manifest, isAnswerable: isAnswerableRoute });
check(!ranked.some((t) => t.route === "/r-one" || t.route === "/h-one"), "ranking admitted a regulated/high route");
check(!ranked.some((t) => t.query === "M One"), "ranking admitted the route's own head term");
check(!ranked.some((t) => t.query === "unmeasured"), "ranking admitted an unmeasured query");
check(ranked.map((t) => t.value).join(",") === "50,5,4,3", `ranking is not by measured demand: ${ranked.map((t) => t.value)}`);
check(rankMediumTargets({ targets, manifest, foldedHubs: new Set(["/m-one"]), isAnswerable: isAnswerableRoute }).every((t) => t.route !== "/m-one"), "ranking admitted a folded hub (#57)");

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
check(has({ ...clean, title: "Something nobody searched" }, ctxFor(t3), "title_not_measured_query"), "gate passed a title that is not the measured query");
check(has({ ...clean, title: "What should I know about m three question" }, ctxFor(t3), "title_not_measured_query"), "gate passed an answer title that is not a question");
check(clean.title === "What should I know about m three question?", `medium title is not a question around the measured query: ${clean.title}`);
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

// 3. the lane: unhealable route skipped, next demand-ranked route taken, cap and one-per-route held.
const lane = runMediumLane({ ranked, manifest, routeCopy: {}, claims, sources, allowlist, asOf, releaseDate: "2026-10-27", releaseId: "r", cap: MEDIUM_LANE_CAP_PER_RELEASE });
check(lane.skipped.some((s) => s.route === "/m-two"), "the lane did not skip and log the unhealable top route");
check(lane.selected.length === 2 && lane.selected[0].route === "/m-one" && lane.selected[1].route === "/m-three", `the lane did not move on to the next routes in demand order: ${lane.selected.map((c) => c.route)}`);
check(new Set(lane.selected.map((c) => c.route)).size === lane.selected.length, "the lane published two pages on one route in one release");
check(lane.selected.every((c) => c.gate?.passed === true), "a selected page carries no passed gate record");
check(lane.stop === null, "the lane stopped although it published");
check(runMediumLane({ ranked, manifest, routeCopy: {}, claims, sources, allowlist, asOf, releaseDate: "2026-10-27", releaseId: "r", cap: 1 }).selected.length === 1, "the lane exceeded its cap");
check(MEDIUM_LANE_CAP_PER_RELEASE >= 1 && MEDIUM_LANE_CAP_PER_RELEASE <= 2, "the medium cap left the 1-2 band");

// 4. measurement, rotation, and the self-clearing stop.
const page = (id, routePath, publishedAt) => ({ id, slug: id, route: routePath, lane: "medium", status: "published_by_contract", publishedAt, title: id });
const old = "2026-09-01T00:00:00.000Z";
const fresh = "2026-10-20T00:00:00.000Z";
const gscNone = { fetchedAt: asOf, rows: [] };
const gscHit = { fetchedAt: asOf, rows: [{ page: "https://approvalprep.com/blog/p-one/", impressions: 3, clicks: 1 }] };
const m0 = measureMediumPages({ answers: [page("p-one", "/m-one", old), page("p-new", "/m-three", fresh)], gsc: gscNone, asOf });
check(m0.find((m) => m.id === "p-one").verdict === "no_impressions", "a page past the window with no impressions was not judged");
check(m0.find((m) => m.id === "p-new").verdict === "measuring", "a page inside the window was judged");
check(measureMediumPages({ answers: [page("p-one", "/m-one", old)], gsc: { fetchedAt: "2026-09-10T00:00:00.000Z", rows: [] }, asOf })[0].verdict === "measuring", "a stale Search Console import was read as no impressions");
const m1 = measureMediumPages({ answers: [page("p-one", "/m-one", old)], gsc: gscHit, asOf });
check(m1[0].impressions === 3 && m1[0].clicks === 1 && m1[0].verdict === "has_impressions", "impressions/clicks were not read from the Search Console rows");
const rot = rotatedRoutes(m0);
check(rot.has("/m-one") && !rot.has("/m-three"), "rotation did not take exactly the route with no impressions after the window");
check(rotatedRoutes(m1).size === 0, "a route with impressions was rotated");
const rotatedLane = runMediumLane({ ranked, manifest, routeCopy: {}, claims, sources, allowlist, asOf, releaseDate: "2026-10-27", releaseId: "r", cap: 2, rotated: rot });
check(rotatedLane.rotations.some((r) => r.route === "/m-one") && rotatedLane.selected.map((c) => c.route).join() === "/m-three", "the lane did not rotate past the no-impression route to the next one");
const allRot = new Map([["/m-one", "x"], ["/m-three", "x"]]);
const stopped = runMediumLane({ ranked, manifest, routeCopy: {}, claims, sources, allowlist, asOf, releaseDate: "2026-10-27", releaseId: "r", cap: 2, rotated: allRot });
check(stopped.selected.length === 0 && stopped.stop?.code === MEDIUM_STOP, "nothing healable left did not end in the named stop");
const cleared = runMediumLane({ ranked, manifest, routeCopy: {}, claims, sources, allowlist, asOf, releaseDate: "2026-10-27", releaseId: "r", cap: 2, rotated: rotatedRoutes(m1) });
check(cleared.stop === null && cleared.selected.length > 0, "the named stop did not clear once impressions appeared");
check(NO_IMPRESSION_WINDOW_DAYS === 28, "the no-impression window drifted from the 28-day Search Console window it is justified by");

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

if (checks < 40) fail(`only ${checks} fixture checks ran`);
if (errors.length) { console.error(`[medium-lane] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[medium-lane] OK fixtureChecks=${checks} healedFailures=${before.failures.length} healAttempts=${healed.attempts} publishedMediumPages=${realMedium} cap=${MEDIUM_LANE_CAP_PER_RELEASE} windowDays=${NO_IMPRESSION_WINDOW_DAYS}`);

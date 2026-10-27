// The medium-risk answer lane (opened 27 Oct 2026).
//
// Why it exists. The low-risk lane is empty: #57 folded every answerable
// low-risk route into a hub, and a folded hub grows no new answers. All 26
// measured searches in data/search_intelligence/target_query_set.json point at
// medium-risk or regulated pages. The decision, taken on the owner's behalf:
// open the MEDIUM lane, keep REGULATED (and high) closed, keep #57's rule.
//
// What it must not undo. The 9 Oct 2026 freeze (scripts/lib/publication_freeze.mjs)
// stopped ~82% of commits going to automated answers for phrasings nobody had
// measured (Search Console: 10 impressions, 0 clicks in 28 days). So a medium
// page is born from a measured query: its title is a question containing that
// query word for word (measuredQuery records it), it passes the
// same freezeDecision(), and the lane is ranked by the measured number.
//
// Stricter than low risk. A medium page publishes only when gateMediumCandidate()
// passes: every factual statement is a registered claim (data/citations/
// claim_registry.json) for that route, each cited to a primary/official source
// in source_registry.json on an allowlisted domain, inside its freshness window;
// no number, fee or date appears that a cited claim does not itself state; no
// approval-promise language; the answer-page boundary plus the medium line is
// attached; the title equals the measured query.
//
// Self-heal. A failing candidate is repaired by healMediumCandidate() (drop a
// source that fails, drop a claim with no valid source left, strip text carrying
// an uncited number or a promise, reattach the boundary) and re-gated, up to
// MAX_HEAL_ATTEMPTS. Still failing: the page is skipped with its reason and the
// lane moves to the next demand-ranked route.
//
// Measurement and rotation. Each medium page's impressions and clicks are read
// from the existing Search Console import. A route whose medium pages all show 0
// impressions after NO_IMPRESSION_WINDOW_DAYS is rotated out and the next route
// is taken. Only when nothing healable is left does the lane end in the named
// stop MEDIUM_LANE_NOTHING_HEALABLE, recomputed every run, so it clears itself.
// Guarded by validate:medium-lane (units) and validate:content-release (the
// real generator).

export const MEDIUM_LANE_CAP_PER_RELEASE = 2;
export const MAX_HEAL_ATTEMPTS = 3;
// The Search Console import (data/intelligence/gsc_search_analytics.json) is a
// rolling 28-day window (window.days = 28). A page judged before it has had one
// full window is judged on partial data, so 28 days is the shortest window the
// existing data can support. A verdict also requires the import to have been
// fetched at least 28 days after publication, so a stale import never reads as
// "no impressions".
export const NO_IMPRESSION_WINDOW_DAYS = 28;
export const MEDIUM_STOP = "MEDIUM_LANE_NOTHING_HEALABLE";
export const OPEN_RISKS = new Set(["medium"]);
export const PRIMARY_AUTHORITY = new Set(["primary", "official", "primary_text"]);
export const ANSWER_BOUNDARY =
  "ApprovalPrep is self-service. It does not contact third parties, create fake documents, provide legal or financial advice, or repair credit. There is no guarantee of approval.";
export const MEDIUM_BOUNDARY =
  "Requirements differ by requester. Every factual statement on this page is cited to an official source below; confirm the exact request with the person or organization asking before you send anything.";
export const MEDIUM_DISCLAIMER = `${ANSWER_BOUNDARY} ${MEDIUM_BOUNDARY}`;
const FRESHNESS_DAYS = { evergreen: Infinity, annual_review: 366, semiannual_review: 184, quarterly_review: 93, monthly_review: 31 };
const PROMISE = /\b(guaranteed approval|guarantees? (?:your )?approval|approval is guaranteed|will (?:be|get) approved|always (?:be |gets? )?approved|instant approval)\b/i;
const NUMERIC = /\$\s?\d|\d|\b(?:january|february|march|april|june|july|august|september|october|november|december)\b|\bpercent\b|\bfee[s]?\b/gi;
export const DEFAULT_STEPS = [
  "Clarify the exact request or decision you are preparing for.",
  "Gather documents that support each factual statement.",
  "Create a short timeline with checked dates, names, and amounts.",
  "Review the packet for truth, relevance, and completeness.",
  "Send the materials yourself and retain a complete copy.",
];
export const DEFAULT_CHECKLIST = [
  "Every statement is truthful and supportable.",
  "Dates, names, and amounts are consistent.",
  "Attachments directly support the explanation.",
  "Unsupported claims and unnecessary detail are removed.",
];
export const DEFAULT_MISTAKES = [
  "Sending a long story without supporting proof.",
  "Using language that sounds like a guarantee or threat.",
  "Forgetting to keep a complete copy trail.",
];

import { containsQuery } from "./publication_freeze.mjs";
export const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const sentenceCase = (q) => { const s = String(q).trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const QUESTION_START = /^(how|what|does|do|is|are|can|should|when|why|who|where|which|will)\b/i;
const DOCUMENT_NOUN = /\b(letter|checklist|form|template|sample|statement|packet|application)$/i;
// Answer pages are questions (validate:answer-page-subject). The title is the
// measured query itself when it is already a question, otherwise a question that
// contains the query word for word, so freezeDecision() still matches it.
export function questionTitle(query) {
  const q = String(query).trim().replace(/\?+$/, "");
  if (QUESTION_START.test(q)) return `${sentenceCase(q)}?`;
  const article = DOCUMENT_NOUN.test(q) ? (/^[aeiou]/i.test(q) ? "an " : "a ") : "";
  return `What should I know about ${article}${q}?`;
}
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;
const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase(); } catch { return null; } };
export const domainAllowed = (url, allowlist) => {
  const host = hostOf(url);
  if (!host) return false;
  return allowlist.some((d) => (d.startsWith(".") ? host.endsWith(d) : host === d || host.endsWith(`.${d}`)));
};

// The measured targets the medium lane may write for, ranked by measured
// demand (highest number first). A target is excluded when its route is not
// medium (regulated/high stay closed), is not answerable, is a folded hub (#57),
// or when the query is the route's own head term (that page already answers it;
// a second page would only compete with it).
export function rankMediumTargets({ targets, manifest, foldedHubs = new Set(), isAnswerable }) {
  const byPath = new Map((manifest.routes || []).map((r) => [r.path, r]));
  const out = [];
  const seen = new Set();
  for (const t of targets || []) {
    const value = Number(t?.measurement?.value);
    if (!t?.source || !(value > 0)) continue;
    const route = byPath.get(t.expected_owned_route);
    if (!route || route.type !== "public" || !route.index) continue;
    if (!OPEN_RISKS.has(route.risk)) continue;
    if (isAnswerable && !isAnswerable(route)) continue;
    if (foldedHubs.has(route.path)) continue;
    const q = norm(t.query);
    if (!q || seen.has(q)) continue;
    if (q === norm(route.title) || slug(q) === route.path.split("/").filter(Boolean).pop()) continue;
    seen.add(q);
    out.push({ query: t.query, route: route.path, risk: route.risk, source: t.source, metric: t.measurement.metric, value });
  }
  return out.sort((a, b) => b.value - a.value || a.query.localeCompare(b.query));
}

// The candidate. Every factual statement is a registered claim for the route;
// steps/checklist/mistakes come from the route's own published copy.
export function buildMediumCandidate({ target, route, routeCopy = {}, claims, sources, releaseDate, releaseId, index = 1 }) {
  const sourceById = new Map((sources || []).map((s) => [s.source_id, s]));
  const routeClaims = (claims || []).filter((c) => c.page_route === route.path && c.status === "active" && OPEN_RISKS.has(c.risk_class));
  const citations = routeClaims.map((c) => ({
    claimId: c.claim_id,
    claimText: c.claim_text,
    lastVerifiedAt: c.last_verified_at,
    freshnessClass: c.freshness_class,
    sources: (c.source_ids || []).map((id) => {
      const s = sourceById.get(id);
      return s ? { sourceId: id, name: s.source_name, url: s.url, authorityClass: s.authority_class } : { sourceId: id, missing: true };
    }),
  }));
  const title = questionTitle(target.query);
  const pageSlug = slug(title);
  const claimSentences = citations.map((c) => c.claimText).join(" ");
  const answer = `${claimSentences} ${routeCopy.shortAnswer || ""} Use it to prepare a truthful packet for the ${route.title.toLowerCase()} and confirm exactly what the requester asks for before you send anything.`.replace(/\s+/g, " ").trim();
  const list = (v, fallback) => (Array.isArray(v) && v.length ? v.slice(0, 6) : fallback);
  return {
    id: `daily-${releaseDate}-m${String(index).padStart(2, "0")}-${pageSlug}`,
    slug: pageSlug,
    title,
    route: route.path,
    riskLevel: "medium",
    lane: "medium",
    status: "published_by_contract",
    answer,
    steps: list(routeCopy.steps, DEFAULT_STEPS),
    checklist: list(routeCopy.reviewChecklist || routeCopy.prepBrief, DEFAULT_CHECKLIST),
    commonMistakes: list(routeCopy.commonMistakes, DEFAULT_MISTAKES),
    citations,
    boundary: MEDIUM_DISCLAIMER,
    measuredQuery: { query: target.query, source: target.source, metric: target.metric, value: target.value },
    contentKey: `${route.path}::medium::${slug(target.query)}`,
    releaseId,
    publishedAt: `${releaseDate}T00:00:00.000Z`,
    generatedBy: "scheduled_content_release_v2_medium_lane",
  };
}

const textFields = (c) => [c.answer, ...(c.steps || []), ...(c.checklist || []), ...(c.commonMistakes || [])];

// The hard gate. Returns every failure, not the first, so a repair sees all.
export function gateMediumCandidate(candidate, { route, target, allowlist, asOf, registeredClaims }) {
  const failures = [];
  if (!route || !OPEN_RISKS.has(route.risk)) failures.push(`risk_closed:${route?.risk || "unrouted"}`);
  if (candidate.riskLevel !== "medium") failures.push("risk_label_not_medium");
  if (!target || !containsQuery(candidate.title, target.query) || !/\?$/.test(String(candidate.title).trim()) || norm(candidate.measuredQuery?.query) !== norm(target.query)) failures.push("title_not_measured_query");
  if (route && candidate.route !== route.path) failures.push("route_mismatch");
  const cites = candidate.citations || [];
  if (!cites.length) failures.push("no_cited_claim");
  const registry = new Map((registeredClaims || []).map((c) => [c.claim_id, c]));
  for (const c of cites) {
    const reg = registry.get(c.claimId);
    if (!reg || reg.status !== "active" || reg.claim_text !== c.claimText || reg.page_route !== candidate.route) failures.push(`claim_inconsistent:${c.claimId}`);
    const maxAge = FRESHNESS_DAYS[c.freshnessClass] ?? 366;
    if (!c.lastVerifiedAt || daysBetween(c.lastVerifiedAt, asOf) > maxAge) failures.push(`claim_stale:${c.claimId}`);
    if (!(c.sources || []).length) failures.push(`claim_unsourced:${c.claimId}`);
    for (const s of c.sources || []) {
      if (s.missing) failures.push(`source_missing:${s.sourceId}`);
      else if (!PRIMARY_AUTHORITY.has(s.authorityClass)) failures.push(`source_not_primary:${s.sourceId}`);
      else if (!domainAllowed(s.url, allowlist)) failures.push(`source_domain_not_allowlisted:${s.sourceId}`);
    }
    if (!candidate.answer.includes(c.claimText)) failures.push(`claim_not_on_page:${c.claimId}`);
  }
  const citedText = cites.map((c) => c.claimText).join(" ").toLowerCase();
  for (const text of textFields(candidate)) {
    for (const m of String(text).match(NUMERIC) || []) {
      if (!citedText.includes(m.toLowerCase())) { failures.push(`uncited_number:${m.trim()}`); break; }
    }
    if (PROMISE.test(text)) failures.push("approval_promise");
  }
  if (candidate.boundary !== MEDIUM_DISCLAIMER) failures.push("disclaimer_missing");
  for (const [field, min] of [["steps", 3], ["checklist", 3], ["commonMistakes", 3]]) if (!((candidate[field] || []).length >= min)) failures.push(`thin_${field}`);
  return { ok: failures.length === 0, failures: [...new Set(failures)] };
}

// One repair pass. Each rule removes or replaces only what the gate named.
export function repairMediumCandidate(candidate, failures, { allowlist }) {
  const repairs = [];
  const next = structuredClone(candidate);
  const badSource = (s) => s.missing || !PRIMARY_AUTHORITY.has(s.authorityClass) || !domainAllowed(s.url, allowlist);
  if (failures.some((f) => /^source_|^claim_unsourced/.test(f))) {
    for (const c of next.citations) {
      const kept = c.sources.filter((s) => !badSource(s));
      if (kept.length !== c.sources.length) repairs.push(`resourced:${c.claimId}:kept_${kept.map((s) => s.sourceId).join("+") || "none"}`);
      c.sources = kept;
    }
  }
  const dropIds = new Set(failures.filter((f) => /^claim_(stale|inconsistent):/.test(f)).map((f) => f.split(":")[1]));
  for (const c of next.citations) if (!c.sources.length) dropIds.add(c.claimId);
  if (dropIds.size) {
    for (const id of dropIds) {
      const c = next.citations.find((x) => x.claimId === id);
      if (c) next.answer = next.answer.replace(c.claimText, "").replace(/\s+/g, " ").trim();
      repairs.push(`dropped_claim:${id}`);
    }
    next.citations = next.citations.filter((c) => !dropIds.has(c.claimId));
  }
  const cited = next.citations.map((c) => c.claimText).join(" ").toLowerCase();
  const clean = (t) => !PROMISE.test(t) && !(String(t).match(NUMERIC) || []).some((m) => !cited.includes(m.toLowerCase()));
  if (failures.some((f) => f.startsWith("uncited_number") || f === "approval_promise" || f.startsWith("thin_") || f.startsWith("claim_not_on_page"))) {
    const sentences = next.answer.split(/(?<=[.?!])\s+/);
    const keptSentences = sentences.filter(clean);
    for (const c of next.citations) if (!keptSentences.join(" ").includes(c.claimText)) keptSentences.unshift(c.claimText);
    if (keptSentences.length !== sentences.length || keptSentences.join(" ") !== next.answer) { repairs.push(`answer_rewritten:${sentences.length - keptSentences.length}_sentence(s)_removed`); next.answer = keptSentences.join(" "); }
    for (const [field, fallback] of [["steps", DEFAULT_STEPS], ["checklist", DEFAULT_CHECKLIST], ["commonMistakes", DEFAULT_MISTAKES]]) {
      const kept = (next[field] || []).filter(clean);
      for (const item of fallback) if (kept.length < 3 && !kept.includes(item)) kept.push(item);
      if (kept.length !== (next[field] || []).length || kept.some((x, i) => x !== next[field][i])) repairs.push(`${field}_repaired`);
      next[field] = kept;
    }
  }
  if (failures.includes("disclaimer_missing")) { next.boundary = MEDIUM_DISCLAIMER; repairs.push("disclaimer_reattached"); }
  if (failures.includes("risk_label_not_medium")) { next.riskLevel = "medium"; repairs.push("risk_label_set"); }
  return { candidate: next, repairs };
}

// Gate, repair, re-gate, up to MAX_HEAL_ATTEMPTS. Failures no repair can touch
// (a closed risk, a title that is not the measured query, no claim left) end it.
export function healMediumCandidate(candidate, ctx) {
  let current = candidate;
  const repairs = [];
  let gate = gateMediumCandidate(current, ctx);
  let attempts = 0;
  while (!gate.ok && attempts < MAX_HEAL_ATTEMPTS) {
    if (gate.failures.some((f) => f.startsWith("risk_closed") || f === "title_not_measured_query" || f === "route_mismatch")) break;
    attempts += 1;
    const pass = repairMediumCandidate(current, gate.failures, ctx);
    if (!pass.repairs.length) break;
    repairs.push(...pass.repairs);
    current = pass.candidate;
    gate = gateMediumCandidate(current, ctx);
  }
  return { ok: gate.ok, candidate: current, attempts, repairs, failures: gate.failures };
}

// Impressions/clicks per medium page from the existing Search Console import,
// plus the verdict the rotation reads.
export function measureMediumPages({ answers, gsc, asOf, windowDays = NO_IMPRESSION_WINDOW_DAYS }) {
  const rows = gsc?.rows || [];
  const fetchedAt = gsc?.fetchedAt || null;
  return (answers || [])
    .filter((a) => a.lane === "medium" && a.status === "published_by_contract")
    .map((a) => {
      const path = `/blog/${a.slug}`;
      const mine = rows.filter((r) => { try { return new URL(r.page).pathname.replace(/\/+$/, "") === path; } catch { return false; } });
      const impressions = mine.reduce((n, r) => n + (Number(r.impressions) || 0), 0);
      const clicks = mine.reduce((n, r) => n + (Number(r.clicks) || 0), 0);
      const ageDays = Math.floor(daysBetween(a.publishedAt, asOf));
      const importCovers = fetchedAt && daysBetween(a.publishedAt, fetchedAt) >= windowDays;
      const verdict = impressions > 0 ? "has_impressions" : ageDays >= windowDays && importCovers ? "no_impressions" : "measuring";
      return { id: a.id, route: a.route, path, query: a.measuredQuery?.query || a.title, publishedAt: a.publishedAt, impressions, clicks, ageDays, verdict };
    });
}

// A route is rotated out when it has at least one judged page and none of its
// medium pages shows an impression. Recomputed every run: the first impression
// brings it back.
export function rotatedRoutes(measurements) {
  const byRoute = new Map();
  for (const m of measurements) {
    const r = byRoute.get(m.route) || { judgedNone: 0, any: 0 };
    if (m.verdict === "no_impressions") r.judgedNone += 1;
    if (m.verdict === "has_impressions") r.any += 1;
    byRoute.set(m.route, r);
  }
  return new Map([...byRoute].filter(([, r]) => r.judgedNone > 0 && r.any === 0).map(([route, r]) => [route, `no impressions on ${r.judgedNone} medium page(s) after ${NO_IMPRESSION_WINDOW_DAYS} days`]));
}

// The lane: walk demand-ranked targets, skip rotated routes and what is already
// published, heal each candidate, take at most `cap`, one per route.
export function runMediumLane({ ranked, manifest, routeCopy, claims, sources, allowlist, asOf, releaseDate, releaseId, cap, rotated = new Map(), isTaken = () => false, admit = () => ({ allowed: true }) }) {
  const byPath = new Map((manifest.routes || []).map((r) => [r.path, r]));
  const selected = [];
  const skipped = [];
  const rotations = [];
  const usedRoutes = new Set();
  let considered = 0;
  for (const target of ranked) {
    if (selected.length >= cap) break;
    if (usedRoutes.has(target.route)) continue;
    if (rotated.has(target.route)) { rotations.push({ route: target.route, query: target.query, reason: rotated.get(target.route) }); continue; }
    const route = byPath.get(target.route);
    const candidate = buildMediumCandidate({ target, route, routeCopy: routeCopy[route.path] || {}, claims, sources, releaseDate, releaseId, index: selected.length + 1 });
    if (isTaken(candidate)) continue;
    considered += 1;
    const healed = healMediumCandidate(candidate, { route, target, allowlist, asOf, registeredClaims: claims });
    if (!healed.ok) { skipped.push({ route: target.route, query: target.query, attempts: healed.attempts, repairs: healed.repairs, reason: healed.failures.join(",") }); continue; }
    const decision = admit(healed.candidate);
    if (!decision.allowed) { skipped.push({ route: target.route, query: target.query, attempts: healed.attempts, repairs: healed.repairs, reason: decision.reason }); continue; }
    healed.candidate.gate = { passed: true, attempts: healed.attempts, repairs: healed.repairs, gatedAt: asOf };
    selected.push(healed.candidate);
    usedRoutes.add(target.route);
  }
  const stop = selected.length === 0 && cap > 0 && (considered > 0 || rotations.length > 0)
    ? { code: MEDIUM_STOP, skipped: skipped.length, rotated: rotations.length, reason: `every eligible medium route failed its gates after repair or was rotated out for no impressions` }
    : selected.length === 0 && cap > 0 && ranked.length === 0
      ? { code: MEDIUM_STOP, skipped: 0, rotated: 0, reason: "no measured target points at an open (medium, answerable, non-folded) route" }
      : null;
  return { selected, skipped, rotations, stop };
}

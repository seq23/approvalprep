#!/usr/bin/env node
/**
 * Wire the measured-demand coverage pages into every registry that has to know
 * about a route.
 *
 * A page on this site is not one file. A published route has to appear in the
 * route manifest (sitemap + breadcrumb titles), the atlas admission manifest,
 * the query universe and its mirror matrix, the fanout map, the answer-atom
 * corpus, the internal link graph and its anchor registry, and the route-copy
 * corpus that public-page-depth measures. Adding a page by hand across eight
 * JSON files is how a route ends up half-registered and a HARD_FAIL validator
 * finds it later.
 *
 * Everything written here is derived from the page's own authored content in
 * data/content/demand_coverage_pages.json. Nothing is invented: the atoms are
 * the page's own sentences, the queries are the page's own target phrasings, and
 * the route copy is the page's own fields reshaped into the depth contract.
 *
 * Idempotent: re-running replaces this set's records rather than appending.
 *
 *   node scripts/content/register-demand-coverage-pages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const write = (rel, data) => fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`);

const registry = read('data/content/demand_coverage_pages.json');
const pages = registry.pages;
const OWNED = new Set(pages.map((p) => p.path));
const slugKey = (p) => p.path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_');

const TRUST = ['No account required', 'No stored letter answers', 'Free browser-only drafting', 'Self-service only', 'You send it yourself'];

/* ---------------------------------------------------------------- route manifest */
{
  const file = 'data/routes/route_manifest.json';
  const manifest = read(file);
  manifest.routes = manifest.routes.filter((r) => !OWNED.has(r.path));
  for (const page of pages) {
    manifest.routes.push({
      path: page.path,
      title: page.title,
      type: 'public',
      family: page.family,
      index: true,
      risk: page.risk || 'medium',
      nav: false,
      description: page.description,
      indexing: 'index',
      page_intent: page.generator ? 'free_tool' : 'guide',
      conversion_role: 'assist',
      cta_policy: 'purchase',
      allowed_cta_count: 'multiple',
      primary_cta: page.primaryCta,
      secondary_cta: page.secondaryCta,
      search_role: 'rank',
      citation_role: 'citation_surface',
    });
  }
  write(file, manifest);
}

/* ------------------------------------------------------- atlas route admission */
{
  const file = 'data/atlas/route_admission_manifest.json';
  const admission = read(file);
  admission.routes = admission.routes.filter((r) => !OWNED.has(r.route));
  for (const page of pages) {
    admission.routes.push({
      route: page.path,
      family: page.family,
      status: 'ADMITTED_INDEXABLE',
      risk: page.risk || 'medium',
      index: true,
      minimum_queries: 5,
    });
  }
  write(file, admission);
}

/* -------------------------------------- query universe + matrix mirror + fanout */
{
  const universeFile = 'data/atlas/query_universe.json';
  const matrixFile = 'data/atlas/query_matrix.json';
  const fanoutFile = 'data/atlas/fanout_query_map.json';
  const universe = read(universeFile);
  const matrix = read(matrixFile);
  const fanout = read(fanoutFile);

  universe.queries = universe.queries.filter((q) => !OWNED.has(q.route_owner));
  fanout.parent_queries = fanout.parent_queries.filter((p) => !OWNED.has(p.route_owner));

  // Query id numbering continues the existing sequence rather than restarting,
  // so an id always points at one query for the life of the corpus.
  let counter = universe.queries.reduce((max, q) => {
    const m = /^atlas_q_(\d+)_/.exec(q.query_id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const INTENTS = [
    ['definition', 'awareness'],
    ['checklist', 'consideration'],
    ['how_to', 'consideration'],
    ['mistake_prevention', 'risk_reduction'],
    ['purchase_evaluation', 'decision'],
  ];

  for (const page of pages) {
    const atomIds = page.atoms.map((atom) => `atom_${slugKey(page)}_${atom.id}`);
    const ids = [];
    INTENTS.forEach(([intent, stage], index) => {
      counter += 1;
      const queryText = page.queries[index];
      const id = `atlas_q_${String(counter).padStart(4, '0')}_${slugKey(page)}_${intent}`;
      ids.push(id);
      universe.queries.push({
        query_id: id,
        query_text: queryText,
        query_normalized: queryText.toLowerCase(),
        source_platform: index === 0 ? 'semrush_keyword_magic' : 'owned_query_atlas',
        source_type: index === 0 ? 'measured_search_demand_t2b' : 'route_copy_atom_expansion_v2',
        intent_class: intent,
        funnel_stage: stage,
        entity_ids: ['approvalprep'],
        pillar_id: page.family,
        cluster_id: page.family,
        page_family_id: page.family,
        route_owner: page.path,
        atom_ids: atomIds,
        claim_ids: ['claim_no_fake_docs', 'claim_no_approval_guarantee'],
        source_ids: ['approvalprep_owner_policy'],
        risk_level: page.risk || 'medium',
        privacy_class: 'public_query',
        allowed_use: 'query_language_and_content_briefing',
        status: 'ADMITTED_INDEXABLE',
        reviewed_by: 'work_cover_measured_demand_2026_08_27',
        reviewed_at: '2026-08-27',
      });
    });
    fanout.parent_queries.push({
      parent_id: ids[0],
      route_owner: page.path,
      page_family_id: page.family,
      children: ids.slice(1),
      child_count: ids.length - 1,
      unique_intents: INTENTS.slice(1).map(([intent]) => intent),
      status: 'admitted_unique_intent_fanout',
    });
  }

  universe.queries.sort((a, b) => a.query_id.localeCompare(b.query_id));
  // The matrix is declared as a mirror of the universe, and the validator checks
  // the counts match. Rebuilding it from the universe keeps that true by
  // construction instead of by two edits staying in step.
  matrix.rows = universe.queries.map((q) => ({
    query_id: q.query_id,
    route_owner: q.route_owner,
    intent_class: q.intent_class,
    risk_level: q.risk_level,
    status: q.status,
    source_type: q.source_type,
  }));

  write(universeFile, universe);
  write(matrixFile, matrix);
  write(fanoutFile, fanout);
}

/* ------------------------------------------------------------------ answer atoms */
{
  const file = 'data/atoms/answer_atoms.json';
  const usageFile = 'data/atoms/atom_usage_map.json';
  const sourceFile = 'data/atoms/atom_source_map.json';
  const corpus = read(file);
  const usage = read(usageFile);
  const sourceMap = read(sourceFile);
  const dropped = new Set(corpus.atoms.filter((a) => OWNED.has(a.route_owner)).map((a) => a.atom_id));
  corpus.atoms = corpus.atoms.filter((a) => !OWNED.has(a.route_owner));
  usage.usage = usage.usage.filter((u) => !dropped.has(u.atom_id));
  sourceMap.mappings = sourceMap.mappings.filter((m) => !dropped.has(m.atom_id));
  const families = read('data/atlas/page_family_registry.json').pageFamilies.map((f) => f.id);
  for (const page of pages) {
    for (const atom of page.atoms) {
      const atomId = `atom_${slugKey(page)}_${atom.id}`;
      // An atom that nothing declares a use for, and nothing traces to a source,
      // is an orphan record; validate:atoms rejects both cases.
      usage.usage.push({ atom_id: atomId, routes: [page.path, '/llms.txt', '/llms-full.txt'] });
      sourceMap.mappings.push({ atom_id: atomId, claim_ids: ['claim_no_fake_docs', 'claim_no_approval_guarantee'], source_ids: ['approvalprep_owner_policy'] });
      corpus.atoms.push({
        atom_id: atomId,
        atom_type: atom.type,
        title: `${page.title} ${atom.title}`,
        text: atom.text,
        route_owner: page.path,
        uniqueness_key: `atom_${slugKey(page)}_${atom.id}-v1`,
        reuse_policy: 'route scoped primary reuse',
        source_basis: 'approvalprep_owner_policy',
        claim_ids: ['claim_no_fake_docs', 'claim_no_approval_guarantee'],
        allowed_page_families: families,
        forbidden_contexts: ['guaranteed_approval', 'credit_repair_service_claim', 'fake_documents'],
        last_reviewed_at: '2026-08-27',
      });
    }
  }
  write(file, corpus);
  write(usageFile, usage);
  write(sourceFile, sourceMap);
}

/* ------------------------------------------------------------------- route copy */
{
  // public-page-depth measures every indexed route's copy record, including the
  // routes rendered by AuthorityGuidePage. The record is built from the page's
  // own authored content so the measurement is of real copy, not of filler
  // written to clear a word count.
  const file = 'data/content/generated_route_copy.json';
  const copy = read(file);
  for (const page of pages) {
    copy.routes[page.path] = {
      heading: page.title,
      lead: page.description,
      shortAnswer: page.summary,
      decisionContext: page.decisionContext,
      whoFor: page.whoFor,
      value: page.value,
      whatYouGet: page.whatYouGet,
      useCases: page.useCases,
      prepBrief: page.fields,
      commonMistakes: page.mistakes,
      reviewChecklist: page.reviewChecklist,
      steps: page.steps,
      faq: page.faq,
      trustSignals: TRUST,
      primaryCta: page.primaryCta,
      secondaryCta: page.secondaryCta,
      citationSummary: page.summary,
    };
  }
  write(file, copy);
}

/* -------------------------------------------------- internal links and anchors */
{
  const graphFile = 'data/atlas/internal_link_graph.json';
  const anchorFile = 'data/atlas/anchor_text_registry.json';
  const graph = read(graphFile);
  const anchors = read(anchorFile);
  const manifest = read('data/routes/route_manifest.json');
  const titleOf = Object.fromEntries(manifest.routes.map((r) => [r.path, r.title]));
  const publicPaths = new Set(manifest.routes.filter((r) => r.index && r.type === 'public').map((r) => r.path));

  graph.records = graph.records.filter((r) => !OWNED.has(r.path));
  anchors.anchors = anchors.anchors.filter((a) => !OWNED.has(a.source));

  // A new page with no inbound link is reachable only from the sitemap. Each of
  // these pages names the existing routes it should sit beside, and the link is
  // added in both directions.
  for (const page of pages) {
    const links = page.relatedPaths
      .filter((href) => publicPaths.has(href) && href !== page.path)
      .map((href) => ({ href, title: titleOf[href], reason: 'same_family', anchorText: titleOf[href] }));
    links.push({ href: '/letter-writing-studio', title: 'Free Letter Writing Studio', reason: 'free_start', anchorText: 'Start free for $0' });
    links.push({ href: '/pricing', title: 'ApprovalPrep Pricing', reason: 'compare_kits', anchorText: 'Compare paid kits' });
    const trimmed = links.slice(0, 5);
    if (trimmed.length < 2) throw new Error(`[register] ${page.path} has fewer than two valid links`);
    graph.records.push({ path: page.path, title: page.title, family: page.family, targetProductSku: page.sku, links: trimmed });
    for (const link of trimmed) anchors.anchors.push({ source: page.path, target: link.href, anchorText: link.anchorText, reason: link.reason });

    // Inbound: the closest existing sibling gains a link back, so the new page is
    // reachable by a crawler that never opens the sitemap.
    for (const href of page.inboundFrom || []) {
      const record = graph.records.find((r) => r.path === href);
      if (!record || record.links.some((l) => l.href === page.path)) continue;
      if (record.links.length >= 5) record.links.pop();
      record.links.push({ href: page.path, title: page.title, reason: 'same_family', anchorText: page.anchorText || page.title });
      anchors.anchors.push({ source: href, target: page.path, anchorText: page.anchorText || page.title, reason: 'same_family' });
    }
  }
  write(graphFile, graph);
  write(anchorFile, anchors);
}

console.log(`[register-demand-coverage-pages] OK pages=${pages.length}`);
for (const page of pages) console.log(`  ${page.path.padEnd(42)} ${page.sku}`);

#!/usr/bin/env node
// Fails if a published blog answer page asks a preparation question about a
// route that is not a preparation subject.
//
// scripts/content/generate-candidate.mjs builds every title by stamping a fixed
// question onto a route's own title. It selected routes on `risk` and `index`,
// neither of which says the route is something a person prepares for, so it
// shipped "How should I prepare for Pricing?" on /blog/how-should-i-prepare-for-
// pricing/ - a question nobody asks, answered by a generic review checklist with
// nothing to do with pricing - plus the same stamp on Resources, the Glossary,
// the Methodology page and the Document Readiness Index.
//
// The generator is now gated on the manifest's own `page_intent`. This is the
// guard on the result: it fails on a published record with an ineligible
// subject however that record got there - a hand edit, a restored backup, or a
// future generator that forgets the gate. It also fails when a retired record
// has no 301 behind it, because de-listing a URL without redirecting it is how a
// consolidation turns into a soft 404.
import fs from 'node:fs';
import { ANSWERABLE_PAGE_INTENTS, isAnswerableRoute } from '../content/answer-eligibility.mjs';

const failures = [];
const fail = (msg) => failures.push(msg);

const manifest = JSON.parse(fs.readFileSync('data/routes/route_manifest.json', 'utf8'));
const doc = JSON.parse(fs.readFileSync('data/content/generated_answers.json', 'utf8'));
const routeByPath = new Map((manifest.routes || []).map((route) => [route.path, route]));

const redirectSources = new Set();
if (fs.existsSync('public/_redirects')) {
  for (const line of fs.readFileSync('public/_redirects', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    redirectSources.add(trimmed.split(/\s+/)[0]);
  }
}

const slugify = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

let published = 0;
let retired = 0;
for (const answer of doc.answers || []) {
  const slug = answer.slug || slugify(answer.title || '');
  const route = routeByPath.get(answer.route);

  if (answer.status === 'published_by_contract') {
    published++;
    if (!route) {
      fail(`/blog/${slug}/ names route ${answer.route}, which is not in the route manifest`);
      continue;
    }
    if (!isAnswerableRoute(route)) {
      fail(`/blog/${slug}/ asks "${answer.title}" about ${answer.route}, whose page_intent is "${route.page_intent}" - not a subject anyone prepares for. Answerable intents: ${[...ANSWERABLE_PAGE_INTENTS].join(', ')}`);
    }
    if (!/\?$/.test(String(answer.title || '').trim())) {
      fail(`/blog/${slug}/ is an answer page whose title is not a question: "${answer.title}"`);
    }
    continue;
  }

  if (answer.status === 'redirected_to_canonical') {
    retired++;
    if (!redirectSources.has(`/blog/${slug}`)) {
      fail(`/blog/${slug}/ is retired in generated_answers.json but public/_redirects has no rule for it, so the URL becomes a 404 instead of consolidating`);
    }
    if (!answer.redirectTarget) fail(`/blog/${slug}/ is retired with no redirectTarget recorded`);
  }
}

// Rule 0: a run that examined no answer pages proved nothing.
if (published + retired === 0) {
  console.error('[answer-page-subject] FAIL examined 0 answer records; this check is inert');
  process.exit(1);
}

if (failures.length) {
  console.error(`[answer-page-subject] FAIL ${failures.length} problem(s)`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`[answer-page-subject] OK published=${published} retired=${retired} allSubjectsAnswerable=true`);

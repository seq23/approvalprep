#!/usr/bin/env node
// Every scheduled content release runs `authority:scale:restore` before it
// builds. Restore replaces any route in data/content/generated_route_copy.json
// whose payload no longer hashes to its record in
// data/release/frozen_output_registry.json with the frozen blob. So an edit to a
// frozen route that is not re-frozen passes every PR check and is silently
// reverted on main the next morning.
//
// That is what turned "Scheduled Content Release" red on 26 Sep 2026: PR #38
// rewrote the nine frozen routes' leads into the 110-160 character description
// band but did not re-freeze them, restore put the 168-182 character leads back,
// and validate:title-length failed on the released tree.
//
// This check reads what restore reads and fails when the two disagree, so the
// drift is caught on the PR that introduces it rather than by the release. It
// ignores data/release/active_mutation_scope.json on purpose: the release clears
// that scope before validate:all runs, and a PR never carries one, so at every
// point this validator runs the committed copy must equal the frozen copy.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { readJson, fail } from './_common.mjs';

const REGISTRY = 'data/release/frozen_output_registry.json';
const COPY = 'data/content/generated_route_copy.json';

const sortObj = (o) => Array.isArray(o) ? o.map(sortObj) : (o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortObj(o[k])])) : o);
const stable = (o) => Buffer.from(JSON.stringify(sortObj(o)) + '\n');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const registry = readJson(REGISTRY);
const copy = readJson(COPY);
const records = Object.entries(registry.records || {});
if (records.length === 0) fail(`[frozen-output-drift] FAIL: ${REGISTRY} has zero frozen records - nothing examined is not a pass`);

const problems = [];
for (const [route, record] of records) {
  const blobPath = path.join(process.cwd(), record.blob || '');
  if (!record.blob || !fs.existsSync(blobPath)) { problems.push(`${route}: frozen blob ${record.blob || '(none)'} is missing, so restore cannot run`); continue; }
  const blob = zlib.gunzipSync(fs.readFileSync(blobPath));
  if (sha(blob) !== record.sha256) problems.push(`${route}: frozen blob content does not hash to its registry sha256`);
  if (!(route in (copy.routes || {}))) { problems.push(`${route}: frozen route is missing from ${COPY}`); continue; }
  if (sha(stable(copy.routes[route])) !== record.sha256) problems.push(`${route}: ${COPY} differs from its frozen payload, so the scheduled release's authority:scale:restore will revert this edit`);
}

if (problems.length) {
  console.error(`[frozen-output-drift] FAIL: ${problems.length} problem(s) across ${records.length} frozen route(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('  To accept an intended edit, re-freeze it: list the routes in data/release/active_mutation_scope.json, then `npm run authority:scale:freeze && npm run authority:scale:clear-scope`.');
  process.exit(1);
}
console.log(`[frozen-output-drift] OK frozen=${records.length} matched=${records.length}`);

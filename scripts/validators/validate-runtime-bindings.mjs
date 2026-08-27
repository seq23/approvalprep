#!/usr/bin/env node
/**
 * Two regression guards for faults that fail SILENTLY in production.
 *
 * 1. Every `env.X` referenced in functions/ must be a binding declared in
 *    wrangler.toml. `functions/api/track-event.js` guarded on `env.DB`, which was
 *    never declared, and returned HTTP 200 {ok:true, recorded:false} — so every
 *    conversion event was dropped while the endpoint reported success.
 *
 * 2. Every identifier a `define:vars` inline script reads must actually be injected.
 *    AnalyticsEvent.astro read `source` while only `surface` was injected, so every
 *    send() threw ReferenceError on all 105 live pages.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const failures = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---- Guard 1: env bindings ----------------------------------------------
const toml = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
const declared = new Set([...toml.matchAll(/^\s*binding\s*=\s*"([^"]+)"/gm)].map((m) => m[1]));
// Plain-text vars count as declared. NOTE: because this project has a wrangler.toml,
// Cloudflare Pages treats it as the source of truth and DISCARDS dashboard-set
// plain-text vars on every build — so a var used in functions/ but absent here is
// undefined in production, not merely undocumented.
for (const m of toml.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*"/gm)) {
  if (m[1] !== 'binding') declared.add(m[1]);
}
// Cloudflare-provided and build-time values that are never declared as bindings.
const BUILTIN = new Set(['ASSETS', 'CF_PAGES', 'CF_PAGES_BRANCH', 'CF_PAGES_COMMIT_SHA', 'CF_PAGES_URL']);

for (const file of walk(join(ROOT, 'functions')).filter((f) => /\.(js|mjs|ts)$/.test(f))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\benv\.([A-Z][A-Z0-9_]*)\b/g)) {
    const name = m[1];
    if (declared.has(name) || BUILTIN.has(name)) continue;
    // Secrets are set out-of-band and legitimately absent from wrangler.toml.
    if (/(KEY|SECRET|TOKEN|PASSWORD|WEBHOOK|ENDPOINT)$/.test(name)) continue;
    // A reference with an explicit fallback (`env.X || d`, `env.X ?? d`) is an
    // optional var by design. Only an unguarded read must be declared, because that
    // is the shape that silently evaluates to undefined in production.
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 6);
    if (/^\s*(\|\||\?\?)/.test(after)) continue;
    failures.push(
      `HARD_FAIL ${relative(ROOT, file)}: env.${name} is not a binding declared in wrangler.toml ` +
      `(declared: ${[...declared].join(', ')})`
    );
  }
}

// ---- Guard 2: define:vars completeness ----------------------------------
const RESERVED = new Set([
  'window','document','navigator','console','JSON','Math','Object','Array','String','Number','Boolean',
  'Set','Map','Date','URL','URLSearchParams','Blob','fetch','location','crypto','event','undefined','null',
  'true','false','if','else','return','const','let','var','function','new','try','catch','typeof','instanceof',
  'for','of','in','while','break','continue','this','class','extends','async','await','delete','void','throw',
  'Promise','Error','RegExp','Element','Symbol','globalThis','performance','localStorage','sessionStorage',
]);

for (const file of walk(join(ROOT, 'src')).filter((f) => f.endsWith('.astro'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<script\b[^>]*define:vars=\{\{([^}]*)\}\}[^>]*>([\s\S]*?)<\/script>/g)) {
    const injected = new Set(
      m[1].split(',').map((s) => s.split(':')[0].trim()).filter(Boolean)
    );
    const body = m[2];
    // Identifiers declared inside the script body are fine.
    const local = new Set(
      [...body.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)].map((x) => x[1])
    );
    for (const p of body.matchAll(/\(([^)]*)\)\s*=>/g)) {
      for (const a of p[1].split(',')) {
        const n = a.split('=')[0].trim().replace(/^\.\.\./, '');
        if (/^[A-Za-z_$][\w$]*$/.test(n)) local.add(n);
      }
    }
    // Strip strings/comments so we only look at real identifier reads.
    const code = body
      .replace(/`(?:\\.|[^`\\])*`/g, '``')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const seen = new Set();
    for (const idm of code.matchAll(/(^|[^.\w$'"`])([a-z_$][\w$]*)\s*(?=[,;)\]}\s])/g)) {
      const name = idm[2];
      if (seen.has(name) || injected.has(name) || local.has(name) || RESERVED.has(name)) continue;
      // Only flag object-literal shorthand and bare reads, the shape that broke.
      if (!new RegExp(`(^|[\\s{,])${name}\\s*,`, 'm').test(code)) continue;
      seen.add(name);
      failures.push(
        `HARD_FAIL ${relative(ROOT, file)}: inline script reads \`${name}\` but define:vars injects ` +
        `{${[...injected].join(', ')}} — this throws ReferenceError at runtime and drops the event`
      );
    }
  }
}

if (failures.length) {
  console.log('RUNTIME BINDING CONTRACT: FAIL');
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(
  `RUNTIME BINDING CONTRACT: PASS (${declared.size} declared binding(s); all env.* references and define:vars scripts resolve)`
);

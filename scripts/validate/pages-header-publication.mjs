#!/usr/bin/env node
/**
 * A header rule that matches nothing in the published tree is not a header rule.
 *
 * Background. `_headers` lived at the repo root until 2026-09-01. Cloudflare
 * Pages publishes `pages_build_output_dir` (`dist`), Astro copies `public/`
 * into it, and nothing copied a root-level file - so for six days the
 * `/_astro/*` immutable rule had never applied and the live origin returned
 * Pages' 4-hour default on content-hashed assets that can never change.
 *
 * scripts/validate/seo-surfaces.mjs now hard-fails if `dist/_headers` is
 * missing or has lost the immutable rule. That closes the instance. It does not
 * close the class, because it asserts the TEXT of the rule, not that the rule
 * reaches anything:
 *
 *   - it hardcodes `dist/`, so changing `pages_build_output_dir` in
 *     wrangler.toml would publish a directory nothing validates;
 *   - it never compares `dist/_headers` against `public/_headers`, so a stale
 *     dist/ from an earlier build satisfies it;
 *   - it never checks that anything is actually served from `/_astro/`. Astro's
 *     asset directory is configurable (`build.assets`). Change it and the
 *     immutable rule silently governs an empty path - the exact original defect
 *     (correct-looking rule, zero live effect), with a green validator on top.
 *
 * This validator asserts the artefact behaviourally: the published directory is
 * the one Cloudflare is configured to publish, its `_headers` is byte-identical
 * to the tracked source in `public/`, and every rule in it matches at least one
 * file that is actually shipped.
 *
 * Rule 0: zero header rules examined, zero files in the published tree, or zero
 * content-hashed assets is a hard failure - not a quiet pass on an empty loop.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const NAME = 'pages-header-publication';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// Cloudflare Pages path matching: `*` is a wildcard, `:name` a placeholder.
function matcher(pattern) {
  // Tokenise into wildcards (`*`, any characters), placeholders (`:name`, one
  // path segment) and literal text, so no sentinel substitution is needed.
  let source = '';
  const token = /(\*)|(:[A-Za-z0-9_]+)|([^*:]+|:)/g;
  let match;
  while ((match = token.exec(pattern)) !== null) {
    if (match[1]) source += '.*';
    else if (match[2]) source += '[^/]+';
    else source += match[3].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

const HASHED = /\.[A-Za-z0-9_-]{8}\.(css|js|mjs|woff2?)$/;

// 1. The published directory is whatever Cloudflare is told to publish, not a
//    hardcoded "dist". If that setting moves, this validator moves with it.
let outDir = null;
try {
  const wrangler = read('wrangler.toml');
  const match = wrangler.match(/^\s*pages_build_output_dir\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    failures.push(
      'wrangler.toml declares no pages_build_output_dir. Cloudflare Pages then has no published tree, ' +
        'and _headers cannot be shipped from anywhere.'
    );
  } else {
    outDir = match[1].replace(/^\.\//, '').replace(/\/+$/, '');
  }
} catch (error) {
  failures.push(`cannot read wrangler.toml: ${error.message}`);
}

// 2. The source must be tracked at public/_headers. A root-level _headers is the
//    original defect and is never copied into the build output.
const SOURCE = 'public/_headers';
let sourceText = null;
if (!fs.existsSync(path.join(root, SOURCE))) {
  failures.push(
    `${SOURCE} does not exist. Astro copies public/ into the build output; a _headers anywhere else ` +
      '(the repo root, most recently) is never published and its rules never apply.'
  );
} else {
  sourceText = read(SOURCE);
}
if (fs.existsSync(path.join(root, '_headers'))) {
  failures.push(
    'a _headers file exists at the repository root. It is not copied into the build output, so it ships ' +
      `nothing; the published copy must come from ${SOURCE}.`
  );
}

// 3. The published copy must exist and be byte-identical to the source, so a
//    stale build output cannot satisfy this.
let publishedText = null;
const publishedFiles = [];
if (outDir) {
  const publishedHeaders = `${outDir}/_headers`;
  if (!fs.existsSync(path.join(root, publishedHeaders))) {
    failures.push(
      `${publishedHeaders} is missing, so Cloudflare Pages never receives the header rules. ` +
        `Astro copies ${SOURCE} into ${outDir}/ at build time; validator 1 of this registry is that build.`
    );
  } else {
    publishedText = read(publishedHeaders);
    if (sourceText !== null && publishedText !== sourceText) {
      failures.push(
        `${publishedHeaders} differs from ${SOURCE}. The published tree is stale, so the rules Cloudflare ` +
          'serves are not the rules in this commit.'
      );
    }
  }

  const walk = (dir, prefix = '') => {
    let entries = [];
    try {
      entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else publishedFiles.push(rel);
    }
  };
  walk(outDir);

  if (publishedFiles.length === 0) {
    console.error(
      `[${NAME}] FAIL: zero files under ${outDir}/ - refusing to pass on an empty published tree`
    );
    process.exit(1);
  }
}

// 4. Every rule must reach something. A path pattern that matches no shipped
//    file is a rule with no live effect, which is what the /_astro/* immutable
//    rule was for six days.
const rules = [];
if (publishedText !== null) {
  let current = null;
  for (const rawLine of publishedText.split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      current.headers.push(line.trim());
    }
  }
}

if (publishedText !== null && rules.length === 0) {
  console.error(`[${NAME}] FAIL: zero header rules parsed - refusing to pass on an empty _headers`);
  process.exit(1);
}

for (const rule of rules) {
  if (!rule.pattern.startsWith('/')) continue; // absolute-URL rules are not path matches
  if (rule.headers.length === 0) {
    failures.push(`_headers rule "${rule.pattern}" carries no headers, so it sets nothing.`);
    continue;
  }
  const test = matcher(rule.pattern);
  const matched = publishedFiles.filter(
    (file) => test.test(file) || test.test(file.replace(/index\.html$/, ''))
  );
  if (matched.length === 0) {
    failures.push(
      `_headers rule "${rule.pattern}" matches no file in ${outDir}/. The rule looks correct and has no ` +
        'live effect: Cloudflare will serve its default headers on every request. If the build output ' +
        'layout changed (for example Astro `build.assets`), the rule has to change with it.'
    );
  }
}

// 5. Content-hashed assets must actually be covered by an immutable rule. This
//    is the live caching behaviour the whole file exists for.
if (publishedText !== null && outDir) {
  const hashed = publishedFiles.filter((file) => HASHED.test(file));
  if (hashed.length === 0) {
    console.error(
      `[${NAME}] FAIL: zero content-hashed assets found under ${outDir}/ - refusing to pass on an empty ` +
        'loop. Either the build did not run, or the asset pipeline stopped emitting hashed filenames, in ' +
        'which case immutable caching is unsafe and the rule must be reconsidered.'
    );
    process.exit(1);
  }
  const immutableRules = rules.filter((rule) =>
    rule.headers.some(
      (header) => /^cache-control:.*\bimmutable\b/i.test(header) && /max-age=31536000/i.test(header)
    )
  );
  const uncovered = hashed.filter(
    (file) => !immutableRules.some((rule) => matcher(rule.pattern).test(file))
  );
  if (uncovered.length) {
    failures.push(
      `${uncovered.length} content-hashed asset(s) are not covered by a max-age=31536000, immutable rule ` +
        `(for example ${uncovered.slice(0, 3).join(', ')}). These filenames change whenever their content ` +
        "changes, so serving them under Pages' 4-hour default is a permanent, measurable performance loss."
    );
  }
}

if (failures.length) {
  console.error(`[${NAME}] FAIL: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const hashedCount = publishedFiles.filter((file) => HASHED.test(file)).length;
console.log(
  `[${NAME}] OK publishedDir=${outDir} publishedFiles=${publishedFiles.length} ` +
    `headerRules=${rules.length} contentHashedAssets=${hashedCount} ` +
    `source=${SOURCE} identicalToPublishedCopy=true`
);

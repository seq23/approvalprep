#!/usr/bin/env node
// Search Readiness e9: check the shipped HTML, including positive coverage on
// form pages, so removing Clarity everywhere cannot make the guard green.
import fs from 'node:fs';
import path from 'node:path';
import { fail, requireBuildOutput, walk } from './_common.mjs';

const name = 'clarity-scope';
const dir = requireBuildOutput(name);
const failures = [];
let pages = 0, recording = 0, forms = 0;
for (const file of walk(dir).filter((p) => p.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  if (!/<head\b/i.test(html)) continue;
  pages++;
  const markup = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const form = /<form\b/i.test(markup);
  const buy = [...markup.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].some((m) => {
    try {
      const url = new URL((m[1] ?? m[2]).replace(/&amp;/g, '&'), 'https://approvalprep.com/');
      return /^https?:$/.test(url.protocol) &&
        (/(^|\.)(gumroad\.com|stripe\.com|paypal\.com|lemonsqueezy\.com|square\.link|checkout\.shopify\.com)$/i.test(url.hostname) ||
         (url.hostname.replace(/^www\./, '') === 'approvalprep.com' && /\/(checkout|cart|buy|order|book(ing)?)(\/|$)/i.test(url.pathname)));
    } catch { return false; }
  });
  const loaded = /clarity\.ms\/tag\//i.test(html);
  const rel = path.relative(dir, file);
  if (loaded) recording++;
  if (loaded && !form && !buy) failures.push(`${rel}: Clarity loads without a form or buy link`);
  if (form) {
    forms++;
    if (!loaded) failures.push(`${rel}: form page lost its Clarity loader`);
  }
}
if (!pages || !forms) fail(`[${name}] FAIL pages=${pages} forms=${forms}; nothing meaningful checked`);
if (failures.length) fail(`[${name}] FAIL\n- ${failures.join('\n- ')}`);
console.log(`[${name}] OK pages=${pages} recording=${recording} forms=${forms}; no recording outside form or buy pages`);

// One definition of "an outbound link this site emits", shared by the probe
// that measures them (scripts/seo/probe-outbound-links.mjs) and the validator
// that gates them (scripts/validate/outbound-link-health.mjs).
//
// If these two disagreed about what counts as an outbound link, the probe could
// record a clean ledger for one set of URLs while the build shipped a different
// set, and the gate would pass over exactly the links it exists to catch.
import fs from 'node:fs';
import path from 'node:path';

export const DIST = 'dist';
export const LEDGER_PATH = 'data/citations/outbound_link_health.json';
export const SITE_HOSTS = new Set(['approvalprep.com', 'www.approvalprep.com']);

export const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

// The canonical form a URL is stored under in the ledger. HTML entity-encodes
// `&` inside an attribute, so the href text and the URL actually requested
// differ for any query string with more than one parameter; without this the
// probe and the ledger would key the same link two different ways.
export const normalizeOutbound = (raw) => raw.trim().replace(/&amp;/g, '&');

export const isOutbound = (raw) => {
  if (!/^https?:\/\//i.test(raw)) return false;
  let host;
  try { host = new URL(raw).hostname.toLowerCase(); } catch { return false; }
  return !SITE_HOSTS.has(host);
};

// Every outbound <a href> in the built tree, mapped to the pages that emit it.
// Only <a> hrefs: a crawler reports "page has links to a broken page" for links
// a reader can follow, not for a stylesheet or a preconnect hint.
export const collectOutboundLinks = (distDir = DIST) => {
  const links = new Map();
  const htmlFiles = walk(distDir).filter((f) => f.endsWith('.html'));
  for (const file of htmlFiles) {
    const page = `/${path.relative(distDir, file).split(path.sep).join('/')}`
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '/');
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/<a\b[^>]*?\shref\s*=\s*["']([^"']+)["']/gi)) {
      const raw = normalizeOutbound(m[1]);
      if (!isOutbound(raw)) continue;
      if (!links.has(raw)) links.set(raw, new Set());
      links.get(raw).add(page);
    }
  }
  return { links, htmlPages: htmlFiles.length };
};

export const readLedger = (ledgerPath = LEDGER_PATH) => {
  if (!fs.existsSync(ledgerPath)) return null;
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
};

// A link is emitted as an <a href> only when the ledger does not record it as
// gone. Everything else - live, blocked to automated clients, or unreachable
// for a reason the probe proved is on our side of the wire - stays a link.
export const DEAD = 'dead';

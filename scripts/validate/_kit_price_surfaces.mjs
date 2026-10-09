// Every place a customer can read a kit price must show that kit's current price.
//
// The 8 Oct 2026 repricing (#41) changed the label, the D1 seed and the runtime
// seed, and runtime-product-admin pinned those three to each other. It did not
// look at anything else a customer reads, and the Amazon book landing pages kept
// the old $39-$249 prices in their comparison tables. This sweep reads every
// customer-visible surface - the paid PDF/DOCX kit files, site source and content
// data, Functions (emails, API copy), public/ and the built site with its JSON-LD
// when present - finds each "$N" that names a kit, and fails when N is not that
// kit's price in data/products/seed_product_registry.json.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Prices that existed before 8 Oct 2026 and match no current kit. Next to a
// kit word they are always wrong, whatever kit the sentence names.
const RETIRED = new Set([59, 79, 99, 129, 149, 249]);

function aliasesFor(p) {
  const names = new Set([p.name]);
  if (p.slug === 'letter-of-explanation') names.add('Letter of Explanation Kit').add('Letter of Explanation');
  if (p.slug === 'income-employment-letter-kit') names.add('Income and Employment Letter Kit');
  if (p.slug === 'complete-approvalprep-bundle') ['Complete Bundle', 'complete set', 'full bundle', 'the bundle', 'bundle'].forEach((n) => names.add(n));
  return [...names];
}

// --- text extraction --------------------------------------------------------
function zipEntries(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip');
  const size = buf.readUInt32LE(eocd + 12);
  let off = buf.readUInt32LE(eocd + 16);
  const end = off + size;
  const out = [];
  while (off < end && buf.readUInt32LE(off) === 0x02014b50) {
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28), xlen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nlen).toString('utf8');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const payload = buf.slice(start, start + csize);
    out.push({ name, data: method === 0 ? payload : zlib.inflateRawSync(payload) });
    off += 46 + nlen + xlen + clen;
  }
  return out;
}

export function docxText(file) {
  return zipEntries(fs.readFileSync(file))
    .filter((e) => /^word\/.*\.xml$/.test(e.name))
    .map((e) => e.data.toString('utf8').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, ''))
    .join('\n');
}

function ascii85(buf) {
  const s = buf.toString('latin1').replace(/\s+/g, '').replace(/^<~/, '').replace(/~>.*$/, '');
  const out = [];
  let group = [];
  for (const ch of s) {
    if (ch === 'z' && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    group.push(ch.charCodeAt(0) - 33);
    if (group.length === 5) {
      let n = 0; for (const d of group) n = n * 85 + d;
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      group = [];
    }
  }
  if (group.length) {
    const k = group.length;
    while (group.length < 5) group.push(84);
    let n = 0; for (const d of group) n = n * 85 + d;
    out.push(...[(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].slice(0, k - 1));
  }
  return Buffer.from(out);
}

function pdfStrings(content) {
  // Literal strings shown with Tj/TJ; one line per text object.
  const parts = [];
  for (const block of content.split(/\bET\b/)) {
    const strs = [];
    const re = /\(((?:\\.|[^\\)])*)\)/gs;
    let m;
    while ((m = re.exec(block))) strs.push(m[1].replace(/\\([()\\])/g, '$1'));
    if (strs.length) parts.push(strs.join(''));
  }
  return parts.join('\n');
}

export function pdfText(file) {
  const raw = fs.readFileSync(file);
  const text = [];
  let pos = 0;
  let streams = 0;
  for (;;) {
    const s = raw.indexOf('stream', pos, 'latin1');
    if (s < 0) break;
    if (raw.slice(s - 3, s).toString('latin1') === 'end') { pos = s + 6; continue; }
    const dictStart = raw.lastIndexOf('<<', s, 'latin1');
    const dict = raw.slice(dictStart, s).toString('latin1');
    let start = s + 6;
    if (raw[start] === 0x0d) start++;
    if (raw[start] === 0x0a) start++;
    const e = raw.indexOf('endstream', start, 'latin1');
    if (e < 0) break;
    let data = raw.slice(start, e);
    try {
      if (/ASCII85Decode/.test(dict)) data = ascii85(data);
      if (/FlateDecode/.test(dict)) data = zlib.inflateSync(data);
      if (!/\/Subtype\s*\/Image|FontFile|\/Length1/.test(dict)) { text.push(pdfStrings(data.toString('latin1'))); streams++; }
    } catch { /* binary stream we do not read (fonts, images) */ }
    pos = e + 9;
  }
  if (streams === 0) throw new Error(`no readable content streams in ${file}`);
  return text.join('\n');
}

// --- the sweep --------------------------------------------------------------
const TEXT_EXT = /\.(astro|ts|tsx|js|mjs|json|md|mdx|html|xml|txt)$/;
function walk(dir, keep) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, keep)); else if (keep(p)) out.push(p);
  }
  return out;
}

export function customerSurfaces({ buildDir } = {}) {
  const files = [];
  for (const f of walk('seed-downloads', (p) => /\.(pdf|docx)$/.test(p))) files.push(f);
  for (const d of ['src', 'functions', 'public', 'templates', 'data/content', 'data/ux']) files.push(...walk(d, (p) => TEXT_EXT.test(p)));
  if (buildDir && fs.existsSync(buildDir)) files.push(...walk(buildDir, (p) => /\.(html|xml|txt|json)$/.test(p) && !p.includes('/_astro/')));
  return files;
}

function readSurface(file) {
  if (file.endsWith('.pdf')) return pdfText(file);
  if (file.endsWith('.docx')) return docxText(file);
  return fs.readFileSync(file, 'utf8');
}

// Returns { problems, filesRead, downloadsRead, mentionsChecked }.
export function sweepKitPrices(seedProducts, files) {
  const aliases = seedProducts.flatMap((p) => aliasesFor(p).map((a) => ({ a: a.toLowerCase(), slug: p.slug, price: p.priceCents / 100 })))
    .sort((x, y) => y.a.length - x.a.length);
  const problems = [];
  let mentionsChecked = 0, downloadsRead = 0;
  for (const file of files) {
    let text;
    try { text = readSurface(file); } catch (err) { problems.push(`${file}: cannot read (${err.message})`); continue; }
    if (/\.(pdf|docx)$/.test(file)) downloadsRead++;
    const lower = text.toLowerCase();
    // Whole amount tokens, so "$12,000.00" is one amount and never "$1".
    const re = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(text))) {
      if (!/^\d{1,3}(\.00)?$/.test(m[1])) continue; // not a kit price shape (deposits, balances)
      const n = Number(m[1]);
      if (n === 0) continue; // "$0" is the free path, not a kit price
      const after = lower.slice(m.index + m[0].length, m.index + m[0].length + 40);
      const before = lower.slice(Math.max(0, m.index - 140), m.index);
      // "$29 Rental Application Kit" names the kit right after the price;
      // otherwise the nearest kit named before it in the same passage.
      let hit = aliases.find((x) => new RegExp(`^\\s*(?:[a-z+]+\\s){0,1}${x.a.replace(/[+]/g, '\\+')}\\b`).test(after));
      if (!hit) {
        let best = -1;
        for (const x of aliases) { const i = before.lastIndexOf(x.a); if (i > best) { best = i; hit = x; } }
        if (best < 0) hit = null;
      }
      const line = text.slice(0, m.index).split('\n').length;
      const kitWord = /kit|bundle|paid once|complete set/.test(before.slice(-80) + after);
      if (RETIRED.has(n) && kitWord) { problems.push(`${file}:${line}: $${n} is a retired price (${hit ? hit.slug : 'kit copy'})`); mentionsChecked++; continue; }
      if (!hit) continue;
      mentionsChecked++;
      if (n !== hit.price) problems.push(`${file}:${line}: ${hit.slug} shown at $${n}, charged $${hit.price}`);
    }
  }
  return { problems, filesRead: files.length, downloadsRead, mentionsChecked };
}

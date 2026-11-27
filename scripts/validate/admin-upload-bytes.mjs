#!/usr/bin/env node
// Behaviour guard for POST /api/admin/upload and GET /api/download-file (security audit 27 Nov 2026, check 17).
// Runs the real handlers on an in-memory SQLite shaped like D1 (the repo's own migration) and an in-memory R2, and
// fails if: a real PDF, DOCX, PNG, JPEG or WEBP is not stored under its real type; an HTML page, an SVG, a plain zip
// or a renamed file is stored because the browser said it was a PDF, DOCX or image; a stored name keeps an
// extension that is not the file's real one; an image over 10 MB is stored (or one of exactly 10 MB is refused);
// a refused upload writes anything to R2 or D1; a download is served with a stored type other than PDF/DOCX or
// without nosniff. Hard-fails on zero files stored (rule 0). No network. Run by validate:all (HARD_FAIL).
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as upload } from '../../functions/api/admin/upload.js';
import { onRequestGet as download } from '../../functions/api/download-file.js';

const fail = (m) => { console.error(`[admin-upload-bytes] FAIL ${m}`); process.exit(1); };
const raw = new DatabaseSync(':memory:');
raw.exec(fs.readFileSync('migrations/0001_runtime_product_admin.sql', 'utf8'));
const stmt = (sql, args = []) => ({
  async run() { const r = raw.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
  async all() { return { results: raw.prepare(sql).all(...args) }; },
  async first() { return raw.prepare(sql).get(...args) ?? null; },
});
const db = { prepare: (sql) => ({ ...stmt(sql), bind: (...v) => stmt(sql, v) }) };
const r2 = new Map();
const bucket = {
  async put(key, bytes, opts) { r2.set(key, { bytes: new Uint8Array(bytes), contentType: opts?.httpMetadata?.contentType }); },
  async get(key) { const o = r2.get(key); return o ? { body: o.bytes } : null; },
};
const now = new Date().toISOString();
raw.prepare("INSERT INTO products (id,slug,name,status,visibility,created_at,updated_at) VALUES ('credit-letter-kit','credit-letter-kit','Credit Letter Kit','live','public',?,?)").run(now, now);
const env = { PRODUCTS_DB: db, PRODUCT_ASSETS_R2: bucket, ADMIN_GATE_PASSWORD: 'test-admin-password' };
const assetRows = () => Number(raw.prepare('SELECT COUNT(*) AS n FROM product_assets').get().n);

const enc = (s) => new TextEncoder().encode(s);
const join = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };
const PDF = enc('%PDF-1.7\n1 0 obj << >> endobj\n%%EOF\n');
const PNG = join(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), enc('IHDR....'));
const JPEG = join(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), enc('JFIF'));
const WEBP = join(enc('RIFF'), new Uint8Array([0x24, 0, 0, 0]), enc('WEBPVP8 '));
const ZIP = (names) => join(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), enc(names.join('\0')));
const DOCX = ZIP(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
const HTML = enc('<!doctype html><script>alert(1)</script>');
const SVG = enc('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');

const send = async (assetType, bytes, name, claimedType) => {
  const form = new FormData();
  form.set('productId', 'credit-letter-kit'); form.set('assetType', assetType);
  form.set('file', new File([bytes], name, { type: claimedType }));
  const r = await upload({ env, request: new Request('https://approvalprep.com/api/admin/upload', { method: 'POST', headers: { 'x-admin-password': 'test-admin-password', 'cf-connecting-ip': '198.51.100.4' }, body: form }) });
  return { status: r.status, body: await r.json() };
};
let stored = 0;
// 1. Real files are stored under the type read from their bytes, whatever the browser claimed, with their real extension.
for (const [type, bytes, name, claimed, wantMime, wantName] of [
  ['pdf', PDF, 'kit.pdf', 'application/pdf', 'application/pdf', 'kit.pdf'],
  ['pdf', PDF, 'kit.html', 'text/html', 'application/pdf', 'kit.pdf'],
  ['docx', DOCX, 'kit.docx', 'application/octet-stream', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'kit.docx'],
  ['image', PNG, 'cover.png', 'image/png', 'image/png', 'cover.png'],
  ['image', JPEG, 'cover.svg', 'image/svg+xml', 'image/jpeg', 'cover.jpg'],
  ['image', WEBP, 'cover', '', 'image/webp', 'cover.webp'],
]) {
  const r = await send(type, bytes, name, claimed);
  if (r.status !== 200) fail(`a real ${wantMime} (${name}, said ${claimed || 'nothing'}) was refused: ${r.status} ${r.body.error}`);
  const row = raw.prepare('SELECT mime_type, filename, size_bytes FROM product_assets WHERE id = ?').get(r.body.asset.id);
  if (row.mime_type !== wantMime || row.filename !== wantName || row.size_bytes !== bytes.length) fail(`${name} stored as ${row.mime_type} ${row.filename} ${row.size_bytes}B; want ${wantMime} ${wantName} ${bytes.length}B`);
  if (r2.get(r.body.asset.key)?.contentType !== wantMime) fail(`${name} put in R2 as ${r2.get(r.body.asset.key)?.contentType}`);
  stored += 1;
}
// 2. Files that are not what they claim are refused with 415, and nothing is written.
for (const [type, bytes, name, claimed] of [
  ['pdf', HTML, 'kit.pdf', 'application/pdf'],
  ['image', SVG, 'cover.png', 'image/png'],
  ['image', HTML, 'cover.jpg', 'image/jpeg'],
  ['docx', ZIP(['[Content_Types].xml', 'xl/workbook.xml']), 'kit.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['pdf', PNG, 'kit.pdf', 'application/pdf'],
  ['image', PDF, 'cover.png', 'image/png'],
  ['pdf', new Uint8Array(0), 'empty.pdf', 'application/pdf'],
]) {
  const rows = assetRows(), objects = r2.size;
  const r = await send(type, bytes, name, claimed);
  if (r.status !== 415 || r.body.error !== 'UNSUPPORTED_FILE_TYPE') fail(`${name} (really not a ${type}) answered ${r.status} ${r.body.error}`);
  if (assetRows() !== rows || r2.size !== objects) fail(`refused ${name} still wrote to D1 or R2`);
}
// 3. Image size cap: exactly 10 MB is stored, one byte more is refused with 413 and nothing written.
{
  const atCap = new Uint8Array(10 * 1024 * 1024); atCap.set(PNG);
  const ok = await send('image', atCap, 'big.png', 'image/png');
  if (ok.status !== 200) fail(`a 10 MB image was refused (${ok.status} ${ok.body.error})`);
  stored += 1;
  const over = new Uint8Array(10 * 1024 * 1024 + 1); over.set(PNG);
  const rows = assetRows();
  const r = await send('image', over, 'huge.png', 'image/png');
  if (r.status !== 413 || r.body.error !== 'FILE_TOO_LARGE' || assetRows() !== rows) fail(`an image over 10 MB answered ${r.status} ${r.body.error}`);
}
// 4. A download is always served as PDF or DOCX with nosniff, even when the stored row says something else.
{
  raw.prepare("UPDATE product_assets SET mime_type = 'text/html' WHERE product_id = 'credit-letter-kit' AND asset_type = 'pdf' AND active = 1").run();
  raw.prepare("INSERT INTO download_entitlements (id,stripe_session_id,product_id,payment_status,created_at) VALUES ('e1','cs_test_paid','credit-letter-kit','paid',?)").run(now);
  const r = await download({ env, request: new Request('https://approvalprep.com/api/download-file?session_id=cs_test_paid&type=pdf') });
  if (r.status !== 200) fail(`the paid download answered ${r.status}`);
  if (r.headers.get('content-type') !== 'application/pdf' || r.headers.get('x-content-type-options') !== 'nosniff') fail(`the download was served as ${r.headers.get('content-type')}, nosniff ${r.headers.get('x-content-type-options')}`);
}
if (stored < 7) fail(`only ${stored} files stored; the guard saw too little`);
console.log(`[admin-upload-bytes] PASS (${stored} real files stored, 8 refused)`);

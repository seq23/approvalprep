import { confirmSignup, esc, verifyConfirm } from '../_runtime/nurture.js';

// Double opt-in. The link in the confirm email opens a page with ONE button; only pressing it (POST)
// confirms. A link scanner that opens every link in an inbox (GET) therefore never confirms anyone.
const WHAT = {
  'sample:letter-of-explanation': { label: 'Open the sample now', url: '/samples/letter-of-explanation-sample.pdf' },
  'starter:credit-repair': { label: 'Draft free in the Letter Studio', url: '/letter-writing-studio/' },
  'starter:employment-verification': { label: 'Draft free in the Letter Studio', url: '/letter-writing-studio/' }
};
export function page(title, body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · ApprovalPrep</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,700..800&family=Atkinson+Hyperlegible+Next:wght@400;700&display=swap">
<style>:root{--paper:#F7F3EA;--carbon:#1D1C21;--orange:#FF7A3D}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--carbon);font:400 18px/1.55 "Atkinson Hyperlegible Next",Arial,sans-serif}main{max-width:520px;margin:0 auto;padding:56px 16px}h1{font:800 28px/1.15 Archivo,Arial,sans-serif;font-stretch:112%;margin:0 0 16px}.home{display:inline-block;margin-bottom:32px;font:800 20px/1 Archivo,Arial,sans-serif;font-stretch:112%;text-decoration:none}.home span{background:#FFE066;padding:0 4px}button,.button{display:inline-block;min-height:48px;border:2px solid var(--carbon);border-radius:10px;background:var(--orange);color:var(--carbon);font:700 18px/1 inherit;font-family:inherit;padding:14px 22px;text-decoration:none;cursor:pointer}a{color:var(--carbon)}.fine{font-size:15px;opacity:.8}</style>
<main><a class="home" href="/">Approval<span>Prep</span></a><h1>${esc(title)}</h1>${body}</main></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
async function checked(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const token = url.searchParams.get('t') || '';
  if (!env.PRODUCTS_DB || !env.DOWNLOAD_SIGNING_SECRET) return { error: page('Confirming is unavailable right now', '<p>Please try the link again in a few minutes.</p>', 503) };
  if (!(await verifyConfirm(env.DOWNLOAD_SIGNING_SECRET, id, token))) return { error: page('This link is not valid', '<p>Please sign up again on <a href="/">approvalprep.com</a>.</p>', 400) };
  return { id, token };
}
export async function onRequestGet({ request, env }) {
  const c = await checked(request, env);
  if (c.error) return c.error;
  return page('Confirm your email', `<p>Press the button to confirm your address. Then we email you what you asked for.</p><form method="post" action="/api/confirm?id=${esc(c.id)}&amp;t=${esc(c.token)}"><button type="submit">Confirm my email</button></form><p class="fine">Changed your mind? Close this page and we send nothing more.</p>`);
}
export async function onRequestPost({ request, env }, fetchImpl = fetch) {
  const c = await checked(request, env);
  if (c.error) return c.error;
  const r = await confirmSignup(env, c.id, fetchImpl);
  if (r.status === 'UNKNOWN') return page('We could not find that sign-up', '<p>Please sign up again on <a href="/">approvalprep.com</a>.</p>', 404);
  if (r.status === 'OPTED_OUT') return page('You are unsubscribed', '<p>You unsubscribed earlier, so ApprovalPrep will not email you.</p>');
  if (r.sent === 'FAILED') console.error(JSON.stringify({ event: 'CONFIRM_SEND_FAILED' }));
  const next = WHAT[r.source] ?? WHAT['sample:letter-of-explanation'];
  const mail = r.sent === 'FAILED' ? 'The email did not send just now; we will send it again shortly.' : 'It is on its way to your inbox.';
  return page('Confirmed. Thank you.', `<p>${mail}</p><p><a class="button" href="${esc(next.url)}">${esc(next.label)} ›</a></p><p class="fine">Every email has a one-click unsubscribe link.</p>`);
}

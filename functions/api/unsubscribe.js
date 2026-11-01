import { optOut, verifyUnsubscribe } from '../_runtime/nurture.js';

// One-click unsubscribe: GET (the link in every email) and POST (List-Unsubscribe-Post,
// RFC 8058) both opt the address out at once. No login, no confirmation step.
async function handle({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const token = url.searchParams.get('t') || '';
  const page = (msg, status) => new Response(`<!doctype html><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width"><title>Unsubscribe</title><p style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;font-size:18px">${msg}</p>`, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
  if (!env.PRODUCTS_DB || !env.DOWNLOAD_SIGNING_SECRET) return page('Unsubscribe is unavailable right now. Reply to any email and we will remove you by hand.', 503);
  if (!(await verifyUnsubscribe(env.DOWNLOAD_SIGNING_SECRET, id, token))) return page('This unsubscribe link is not valid. Reply to any email and we will remove you by hand.', 400);
  await optOut(env.PRODUCTS_DB, id);
  return page('You are unsubscribed. ApprovalPrep will not email you again.', 200);
}
export const onRequestGet = handle;
export const onRequestPost = handle;

import { emailDownloadLinks } from '../_runtime/resend-download.js';

// Body: { email } only. See WEBSITE_ORDER_EMAIL_LOOKUP in functions/_runtime/resend-download.js.
export async function onRequestPost(context) {
  const waitUntil = typeof context.waitUntil === 'function' ? (p) => context.waitUntil(p) : null;
  return emailDownloadLinks(context.request, context.env, fetch, Date.now(), waitUntil);
}

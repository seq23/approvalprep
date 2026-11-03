import { json } from '../_runtime/responses.js';
import { normalizeEmail, signUpForSample } from '../_runtime/nurture.js';
import { DAY, HOUR, clientIp, sha256, withinLimit } from '../_runtime/rate-limit.js';

// The sample goes to any typed-in address, so sends are capped: 5 an hour per IP, 100 a day overall.
const SAMPLE_LIMITS = { perIpHour: 5, globalDay: 100 };

// The free Letter of Explanation sample (src/components/SampleSignup.astro). The visitor
// types their own address and ticks consent; the sample is emailed at once and the page
// shows the PDF link too. The follow-up series is functions/_runtime/nurture.js.
export async function onRequestPost({ request, env }, fetchImpl = fetch) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'Invalid request.' }, 400);
  if (body.company) return json({ ok: true }); // honeypot
  const email = normalizeEmail(body.email);
  if (!email) return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  if (body.consent !== true) return json({ ok: false, error: 'Please tick the box so we can email the sample.' }, 400);
  if (!env.PRODUCTS_DB) return json({ ok: false, error: 'Sign-up is unavailable right now. Please try again shortly.' }, 503);
  if (!(await withinLimit(env.PRODUCTS_DB, `sample:ip:${await sha256(clientIp(request))}`, SAMPLE_LIMITS.perIpHour, HOUR))
    || !(await withinLimit(env.PRODUCTS_DB, 'sample:global', SAMPLE_LIMITS.globalDay, DAY))) {
    return json({ ok: false, error: 'Too many sign-ups right now. Please try again later.' }, 429);
  }
  const sent = await signUpForSample(env, email, fetchImpl);
  if (sent.status === 'STOPPED') console.error(JSON.stringify({ event: 'SAMPLE_NOT_SENT', stop: sent.stop }));
  return json({ ok: true, emailed: sent.status === 'SENT' || sent.status === 'ALREADY' });
}
export async function onRequestGet() { return json({ ok: false, error: 'POST_REQUIRED' }, 405); }

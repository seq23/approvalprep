import { json } from '../_runtime/responses.js';
import { normalizeEmail, sendFailureStop, signUpForSample } from '../_runtime/nurture.js';
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
  if (body.consent !== true) return json({ ok: false, error: 'Please tick the box so we can email it to you.' }, 400);
  if (!env.PRODUCTS_DB) return json({ ok: false, error: 'Sign-up is unavailable right now. Please try again shortly.' }, 503);
  if (!(await withinLimit(env.PRODUCTS_DB, `sample:ip:${await sha256(clientIp(request))}`, SAMPLE_LIMITS.perIpHour, HOUR))
    || !(await withinLimit(env.PRODUCTS_DB, 'sample:global', SAMPLE_LIMITS.globalDay, DAY))) {
    return json({ ok: false, error: 'Too many sign-ups right now. Please try again later.' }, 429);
  }
  const magnet = body.magnet === 'credit-starter' ? 'credit-starter' : 'loe';
  const sent = await signUpForSample(env, email, fetchImpl, magnet);
  const emailed = sent.status === 'SENT' || sent.status === 'ALREADY';
  // Not emailed is said, never hidden: the page tells the visitor plainly, and the stop is logged by
  // name. The claim was released, so the next nurture tick retries it and goes red if it fails again.
  const stop = emailed || sent.status === 'OPTED_OUT' ? null : (sent.stop ?? sendFailureStop(1));
  if (stop) console.error(JSON.stringify({ event: 'SAMPLE_NOT_SENT', stop }));
  return json({ ok: true, emailed, ...(stop ? { stop } : {}) });
}
export async function onRequestGet() { return json({ ok: false, error: 'POST_REQUIRED' }, 405); }

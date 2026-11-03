import { json } from '../_runtime/responses.js';
import { runNurture } from '../_runtime/nurture.js';
import { safeEqual } from '../_runtime/rate-limit.js';

// Tick (three times a day) from .github/workflows/email-nurture.yml, which sends
// `Authorization: Bearer $NURTURE_RUN_SECRET` (GitHub Actions secret, the same value as the Pages
// secret NURTURE_RUN_SECRET; vault: APPROVALPREP_NURTURE_SECRET). Anyone else gets 401 and nothing
// runs. A site without the secret answers 503 with the NAMED STOP so the workflow goes red.
// It sends only what is due and every send is claimed once in D1, so an extra call sends nothing extra.
export async function onRequestPost({ request, env }) {
  if (!env.NURTURE_RUN_SECRET) return json({ ok: false, stop: 'NAMED STOP [NO_NURTURE_RUN_SECRET] NURTURE_RUN_SECRET is not set on the Pages project' }, 503);
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ') || !(await safeEqual(auth.slice(7), env.NURTURE_RUN_SECRET))) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
  const run = await runNurture(env);
  return json({ ok: !run.stop, ...run }, run.stop ? 503 : 200);
}
export async function onRequestGet() { return json({ ok: false, error: 'POST_REQUIRED' }, 405); }

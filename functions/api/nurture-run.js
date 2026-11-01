import { json } from '../_runtime/responses.js';
import { runNurture } from '../_runtime/nurture.js';

// Tick (three times a day) from .github/workflows/email-nurture.yml. It sends only what is due and every
// send is claimed once in D1, so an extra call sends nothing extra; no secret is needed.
// A missing key answers 503 with the NAMED STOP so the workflow run goes red, never silent.
export async function onRequestPost({ env }) {
  const run = await runNurture(env);
  return json({ ok: !run.stop, ...run }, run.stop ? 503 : 200);
}
export async function onRequestGet() { return json({ ok: false, error: 'POST_REQUIRED' }, 405); }

import { resendDownload } from '../_runtime/resend-download.js';

// Body: { session_id } only. Everything else is ignored; see functions/_runtime/resend-download.js.
export async function onRequestPost({ request, env }) {
  return resendDownload(request, env);
}

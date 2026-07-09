import { json, readJson, nowIso } from '../_runtime/responses.js';

const allowedEvents = new Set(['page_view','related_link_click','studio_click','pricing_click','product_cta_click','checkout_start','checkout_success_seen','download_verified']);
const allowedKeys = new Set(['event','url','path','referrerPath','targetUrl','sku','source','sessionIdHash','createdAt']);
const blockedKeys = ['letterText','documentText','email','phone','name','address','ssn','dob','fullIp','userAgentRaw','freeText'];

function cleanPath(value){
  const text = String(value || '').slice(0, 500);
  try { const url = new URL(text, 'https://approvalprep.com'); return url.pathname + (url.search ? url.search.slice(0,160) : ''); } catch { return text.replace(/[^a-zA-Z0-9_\-/?=&.#]/g,'').slice(0,200); }
}
function hashSession(value){
  const text = String(value || '');
  if (!text) return '';
  let hash = 2166136261;
  for (let i=0;i<text.length;i++){ hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `fnv1a_${(hash>>>0).toString(16)}`;
}
function sanitize(body){
  for (const key of blockedKeys) if (Object.prototype.hasOwnProperty.call(body, key)) throw new Error(`BLOCKED_FIELD_${key}`);
  const event = String(body.event || '').trim();
  if (!allowedEvents.has(event)) throw new Error('EVENT_NOT_ALLOWED');
  const out = { event, createdAt: nowIso() };
  for (const key of allowedKeys) {
    if (!(key in body) || key === 'event' || key === 'createdAt') continue;
    if (key === 'url' || key === 'path' || key === 'referrerPath' || key === 'targetUrl') out[key] = cleanPath(body[key]);
    else if (key === 'sessionIdHash') out[key] = String(body[key]).startsWith('fnv1a_') ? String(body[key]).slice(0,80) : hashSession(body[key]);
    else out[key] = String(body[key] || '').replace(/[\r\n\t]/g,' ').slice(0,120);
  }
  return out;
}

export async function onRequestPost({ request, env }){
  let event;
  try { event = sanitize(await readJson(request)); } catch (e) { return json({ ok:false, error:e.message || 'INVALID_EVENT' }, 400); }
  if (!env.DB || typeof env.DB.prepare !== 'function') return json({ ok:true, recorded:false, mode:'no_d1_binding', acceptedEvent:event.event });
  try {
    await env.DB.prepare('INSERT INTO conversion_events (id,event,path,target_url,sku,source,session_id_hash,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), event.event, event.path || event.url || '', event.targetUrl || '', event.sku || '', event.source || '', event.sessionIdHash || '', event.createdAt)
      .run();
    return json({ ok:true, recorded:true, acceptedEvent:event.event });
  } catch (e) {
    return json({ ok:true, recorded:false, mode:'d1_write_failed', acceptedEvent:event.event, warning:String(e.message || e).slice(0,180) });
  }
}
export async function onRequestGet(){ return json({ ok:false, error:'POST_REQUIRED' }, 405); }

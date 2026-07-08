import { json, nowIso } from './responses.js';
async function sha256Hex(input){ const data = new TextEncoder().encode(input); const hash = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function cookieValue(request,name){ const raw=request.headers.get('cookie')||''; return raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.split('=').slice(1).join('=') || ''; }
export async function requireAdmin(request, env){
  const password = request.headers.get('x-admin-password');
  if (password && password === env.ADMIN_GATE_PASSWORD) return { ok:true, actor:'admin-password' };
  const token = request.headers.get('x-admin-token') || cookieValue(request,'ap_admin');
  if (!token || !env.ADMIN_SESSION_SECRET) return { ok:false, response:json({ ok:false, error:'ADMIN_AUTH_REQUIRED' },401) };
  const expected = await sha256Hex(token + env.ADMIN_SESSION_SECRET);
  if (env.PRODUCTS_DB){ const row = await env.PRODUCTS_DB.prepare('SELECT * FROM admin_sessions WHERE session_hash=? AND revoked_at IS NULL').bind(expected).first(); if (row && new Date(row.expires_at)>new Date()) return { ok:true, actor:'admin-session' }; }
  return { ok:false, response:json({ ok:false, error:'ADMIN_AUTH_REQUIRED' },401) };
}
export async function createAdminSession(env){
  const token = crypto.randomUUID()+'.'+crypto.randomUUID(); const sessionHash = await sha256Hex(token + env.ADMIN_SESSION_SECRET); const created=nowIso(); const expires=new Date(Date.now()+1000*60*60*8).toISOString();
  if (env.PRODUCTS_DB) await env.PRODUCTS_DB.prepare('INSERT INTO admin_sessions (id,session_hash,created_at,expires_at) VALUES (?,?,?,?)').bind(crypto.randomUUID(), sessionHash, created, expires).run();
  return { token, expiresAt: expires };
}
export async function audit(env, action, productId, beforeData, afterData, request){
  if (!env.PRODUCTS_DB) return;
  const ip = request.headers.get('cf-connecting-ip') || ''; const ua = request.headers.get('user-agent') || ''; const ipHash = ip ? await sha256Hex(ip) : '';
  await env.PRODUCTS_DB.prepare('INSERT INTO product_audit_log (id,actor,action,product_id,before_json,after_json,ip_hash,user_agent,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'admin',action,productId||'', JSON.stringify(beforeData||null), JSON.stringify(afterData||null), ipHash, ua.slice(0,500), nowIso()).run();
}
export function slugify(s){ return String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

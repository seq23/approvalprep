import { json } from '../../_runtime/responses.js';
import { requireAdmin } from '../../_runtime/admin.js';
export async function onRequestGet({ request, env }){ const auth=await requireAdmin(request,env); if(!auth.ok) return auth.response; if(!env.PRODUCTS_DB) return json({ok:false,error:'D1_BINDING_REQUIRED'},500); const r=await env.PRODUCTS_DB.prepare('SELECT * FROM product_audit_log ORDER BY created_at DESC LIMIT 200').all(); return json({ok:true,items:r.results||[]}); }

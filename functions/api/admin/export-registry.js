import { json } from '../../_runtime/responses.js';
import { requireAdmin } from '../../_runtime/admin.js';
import { listD1Products } from '../../_runtime/catalog.js';
export async function onRequestGet({ request, env }){ const auth=await requireAdmin(request,env); if(!auth.ok) return auth.response; const products=await listD1Products(env,true); return json({schemaVersion:'4.3.0', exportedAt:new Date().toISOString(), products}); }

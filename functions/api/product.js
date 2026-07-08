import { json } from '../_runtime/responses.js';
import { getProductBySlug, publicProduct } from '../_runtime/catalog.js';
export async function onRequestGet({ request, env }){ const slug=new URL(request.url).searchParams.get('slug'); if(!slug) return json({ok:false,error:'MISSING_SLUG'},400); const p=await getProductBySlug(env,slug); if(!p || p.status!=='live') return json({ok:false,error:'PRODUCT_NOT_AVAILABLE'},404); return json({ok:true,product:publicProduct(p)}); }

import { json, readJson } from '../../_runtime/responses.js';
import { requireAdmin, audit, slugify } from '../../_runtime/admin.js';
import { listD1Products, refreshPublicCache } from '../../_runtime/catalog.js';
export async function onRequestGet({ request, env }){ const auth=await requireAdmin(request,env); if(!auth.ok) return auth.response; return json({ok:true,products:await listD1Products(env,true)}); }
export async function onRequestPost({ request, env }){
  const auth=await requireAdmin(request,env); if(!auth.ok) return auth.response; if(!env.PRODUCTS_DB) return json({ok:false,error:'D1_BINDING_REQUIRED'},500);
  const b=await readJson(request); const name=String(b.name||'').trim(); const slug=slugify(b.slug||name); if(!name||!slug) return json({ok:false,error:'NAME_AND_SLUG_REQUIRED'},400);
  const now=new Date().toISOString(); const id=slug; const price=Number(b.priceCents || Math.round(Number(b.price||0)*100));
  await env.PRODUCTS_DB.prepare("INSERT INTO products (id,slug,name,short_description,long_description,price_cents,currency,status,visibility,featured_rank,is_best_value,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,slug,name,b.shortDescription||'',b.longDescription||'',price,b.currency||'usd','draft','private',100,b.isBestValue?1:0,now,now).run();
  const after=await env.PRODUCTS_DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first(); await audit(env,'product.create',id,null,after,request); await refreshPublicCache(env); return json({ok:true,product:after});
}

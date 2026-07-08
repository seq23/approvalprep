import { json, readJson } from '../../_runtime/responses.js';
import { requireAdmin, audit } from '../../_runtime/admin.js';
import { refreshPublicCache } from '../../_runtime/catalog.js';
const allowed=['name','short_description','long_description','price_cents','currency','featured_rank','is_best_value','stripe_live_product_id','stripe_live_price_id','stripe_test_product_id','stripe_test_price_id','image_asset_id','pdf_asset_id','docx_asset_id'];
export async function onRequestPost({ request, env }){
 const auth=await requireAdmin(request,env); if(!auth.ok) return auth.response; if(!env.PRODUCTS_DB) return json({ok:false,error:'D1_BINDING_REQUIRED'},500);
 const b=await readJson(request); const id=b.id||b.slug; if(!id) return json({ok:false,error:'PRODUCT_ID_REQUIRED'},400); const before=await env.PRODUCTS_DB.prepare('SELECT * FROM products WHERE id=? OR slug=?').bind(id,id).first(); if(!before) return json({ok:false,error:'PRODUCT_NOT_FOUND'},404);
 const updates=[]; const binds=[]; for (const k of allowed){ if (Object.prototype.hasOwnProperty.call(b,k)){ updates.push(`${k}=?`); binds.push(k==='is_best_value' ? (b[k]?1:0) : b[k]); }}
 if(!updates.length) return json({ok:false,error:'NO_ALLOWED_FIELDS'},400); updates.push('updated_at=?'); binds.push(new Date().toISOString()); binds.push(before.id);
 await env.PRODUCTS_DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id=?`).bind(...binds).run(); const after=await env.PRODUCTS_DB.prepare('SELECT * FROM products WHERE id=?').bind(before.id).first(); await audit(env,'product.update',before.id,before,after,request); await refreshPublicCache(env); return json({ok:true,product:after});
}

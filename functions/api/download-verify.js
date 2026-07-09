import { json } from "../_runtime/responses.js";

export async function onRequestGet({ request, env }) {
  const sid = new URL(request.url).searchParams.get("session_id");
  if (!sid) return json({ ok: false, error: "MISSING_SESSION" }, 400);
  if (!env.PRODUCTS_DB) return json({ ok: false, error: "D1_BINDING_REQUIRED" }, 500);

  const ent = await env.PRODUCTS_DB.prepare(
    "SELECT product_id,payment_status,created_at,expires_at,revoked_at FROM download_entitlements WHERE stripe_session_id=? AND revoked_at IS NULL"
  ).bind(sid).first();

  if (!ent || ent.payment_status !== "paid") return json({ ok: false, error: "ENTITLEMENT_NOT_FOUND" }, 404);
  return json({
    ok: true,
    entitlement: {
      productId: ent.product_id,
      paymentStatus: ent.payment_status,
      createdAt: ent.created_at,
      expiresAt: ent.expires_at
    }
  });
}

#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const baseUrl = (process.env.LOCAL_E2E_BASE_URL || process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8788").replace(/\/$/, "");
const discountCode = String(process.env.LOCAL_E2E_DISCOUNT_CODE || "TEST100").trim().toUpperCase();
const skipDiscount = process.env.LOCAL_E2E_SKIP_DISCOUNT === "1";
const selectedProducts = process.env.LOCAL_E2E_PRODUCTS
  ? new Set(process.env.LOCAL_E2E_PRODUCTS.split(",").map((item) => item.trim()).filter(Boolean))
  : null;
const completedSessionId = String(process.env.LOCAL_E2E_COMPLETED_SESSION_ID || "").trim();
const completedSku = String(process.env.LOCAL_E2E_COMPLETED_SKU || "").trim();

const allProducts = JSON.parse(readFileSync("data/products/products.json", "utf8")).products;
const products = allProducts.filter((product) => {
  const active = product.status === "active_paid" && product.stripe_enabled;
  return active && (!selectedProducts || selectedProducts.has(product.sku));
});

if (!products.length) {
  throw new Error("No active paid products matched LOCAL_E2E_PRODUCTS.");
}

const failures = [];
const report = {
  baseUrl,
  ranAt: new Date().toISOString(),
  scope: "checkout_session_creation_success_page_and_optional_completed_download_proof",
  protectedDownloadRoute: "/api/download-file",
  proofBoundary: completedSessionId
    ? "completed Stripe session verification and protected download link fetch will be tested"
    : "checkout creation and success UI only; completed payment/download proof requires LOCAL_E2E_COMPLETED_SESSION_ID",
  discountCode: skipDiscount ? null : discountCode,
  products: [],
  completedSession: null
};

function fail(message, details = {}) {
  failures.push({ message, ...details });
}

async function readResponse(response) {
  const raw = await response.text();
  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  return { raw, json };
}

async function createCheckoutSession(product, mode) {
  const body = { sku: product.sku };
  if (mode === "discount") body.discount_code = discountCode;
  const response = await fetch(`${baseUrl}/api/create-checkout-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const { raw, json } = await readResponse(response);
  const checkoutUrl = String(json?.checkoutUrl || "");
  const ok = response.ok && /^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl);
  const result = {
    mode,
    status: response.status,
    ok,
    sessionId: json?.sessionId || "",
    checkoutUrl,
    error: json?.error || "",
    message: json?.message || "",
    bodySnippet: raw.slice(0, 500)
  };
  if (!ok) fail(`Checkout session creation failed for ${product.sku} (${mode}).`, { sku: product.sku, result });
  return result;
}

async function checkSuccessPage(product) {
  const url = `${baseUrl}/checkout/success?session_id=cs_test_placeholder_for_ui_check&sku=${encodeURIComponent(product.sku)}`;
  const response = await fetch(url);
  const text = await response.text();
  const required = [
    "data-download-panel",
    "Download editable Word document",
    "Optional: prefill a draft in the Studio",
    "download the blank/editable templates"
  ];
  const missing = required.filter((token) => !text.includes(token));
  const ok = response.ok && missing.length === 0;
  const result = { status: response.status, ok, missing };
  if (!ok) fail(`Checkout success page is missing required download/prefill UI for ${product.sku}.`, { sku: product.sku, result });
  return result;
}

async function verifyCompletedDownload() {
  if (!completedSessionId && !completedSku) return null;
  if (!completedSessionId || !completedSku) {
    fail("Both LOCAL_E2E_COMPLETED_SESSION_ID and LOCAL_E2E_COMPLETED_SKU are required for completed-session download proof.");
    return { ok: false, reason: "missing_completed_session_inputs" };
  }

  const response = await fetch(`${baseUrl}/api/verify-download`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: completedSessionId, sku: completedSku })
  });
  const { raw, json } = await readResponse(response);
  const files = Array.isArray(json?.files) ? json.files : [];
  const verification = {
    sku: completedSku,
    sessionId: completedSessionId,
    status: response.status,
    apiStatus: json?.status || "",
    source: json?.source || "",
    ok: response.ok && json?.status === "VERIFIED" && files.length >= 2,
    files: [],
    bodySnippet: raw.slice(0, 700)
  };
  if (!verification.ok) {
    fail("Completed session did not verify or did not return both download links.", { verification });
    return verification;
  }

  for (const filePath of files) {
    const fileUrl = new URL(filePath, `${baseUrl}/`).toString();
    const fileResponse = await fetch(fileUrl);
    const contentType = fileResponse.headers.get("content-type") || "";
    const disposition = fileResponse.headers.get("content-disposition") || "";
    const ok = fileResponse.ok && /attachment/i.test(disposition) && /(pdf|officedocument|octet-stream)/i.test(contentType);
    const fileResult = { path: filePath, status: fileResponse.status, ok, contentType, contentDisposition: disposition };
    verification.files.push(fileResult);
    if (!ok) fail("Protected download link did not return an attachment file.", { sku: completedSku, fileResult });
  }

  verification.ok = verification.files.length >= 2 && verification.files.every((item) => item.ok);
  return verification;
}

for (const product of products) {
  const productResult = {
    sku: product.sku,
    name: product.name,
    fullPriceCheckout: await createCheckoutSession(product, "full_price"),
    discountCheckout: skipDiscount ? { skipped: true } : await createCheckoutSession(product, "discount"),
    successPage: await checkSuccessPage(product)
  };
  report.products.push(productResult);
}

report.completedSession = await verifyCompletedDownload();
report.failures = failures;
report.status = failures.length
  ? "FAIL"
  : completedSessionId
    ? "PASS_COMPLETED_CHECKOUT_AND_PROTECTED_DOWNLOAD_PROOF"
    : "PASS_CHECKOUT_CREATION_AND_SUCCESS_UI_ONLY";

mkdirSync("reports/ops", { recursive: true });
writeFileSync("reports/ops/local-checkout-download-e2e.json", JSON.stringify(report, null, 2) + "\n");

if (failures.length) {
  for (const item of failures) console.error(`[local-checkout-e2e] ${item.message}`);
  process.exit(1);
}

console.log(`[local-checkout-e2e] ${report.status} products=${report.products.length}${completedSessionId ? " completedSession=checked" : " completedSession=not-provided"}`);

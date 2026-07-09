#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { onRequestPost as verifyDownload } from "../../functions/api/verify-download.js";
import { onRequestGet as downloadFile } from "../../functions/api/download-file.js";

const baseUrl = (process.env.LOCAL_E2E_BASE_URL || process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8788").replace(/\/$/, "");
const discountCode = String(process.env.LOCAL_E2E_DISCOUNT_CODE || "TEST100").trim().toUpperCase();
const skipDiscount = process.env.LOCAL_E2E_SKIP_DISCOUNT === "1";
const runFixture = process.env.LOCAL_E2E_FIXTURE === "1" || process.env.LOCAL_E2E_FIXTURE_ONLY === "1";
const fixtureOnly = process.env.LOCAL_E2E_FIXTURE_ONLY === "1";
const selectedProducts = process.env.LOCAL_E2E_PRODUCTS
  ? new Set(process.env.LOCAL_E2E_PRODUCTS.split(",").map((item) => item.trim()).filter(Boolean))
  : null;
const completedSessionId = String(
  process.env.LOCAL_E2E_COMPLETED_SESSION_ID ||
  process.env.APPROVALPREP_COMPLETED_SESSION_ID ||
  process.env.STRIPE_CHECKOUT_SESSION_ID ||
  ""
).trim();
const completedSku = String(process.env.LOCAL_E2E_COMPLETED_SKU || process.env.APPROVALPREP_COMPLETED_SKU || "").trim();

const allProducts = JSON.parse(readFileSync("data/products/products.json", "utf8")).products;
const products = allProducts.filter((product) => {
  const active = product.status === "active_paid" && product.stripe_enabled;
  return active && (!selectedProducts || selectedProducts.has(product.sku));
});

if (!products.length && !fixtureOnly) throw new Error("No active paid products matched LOCAL_E2E_PRODUCTS.");

const failures = [];
const report = {
  baseUrl,
  ranAt: new Date().toISOString(),
  scope: "checkout_session_creation_success_page_optional_completed_download_proof_and_fixture_fulfillment",
  protectedDownloadRoute: "/api/download-file",
  proofBoundary: completedSessionId
    ? "completed Stripe session verification and protected download link fetch will be tested"
    : "checkout creation and success UI only; completed payment/download proof requires a real completed Checkout Session ID",
  completedSessionInputNames: ["LOCAL_E2E_COMPLETED_SESSION_ID", "APPROVALPREP_COMPLETED_SESSION_ID", "STRIPE_CHECKOUT_SESSION_ID"],
  discountCode: skipDiscount ? null : discountCode,
  products: [],
  completedSession: null,
  fixture: null
};

function fail(message, details = {}) { failures.push({ message, ...details }); }
function snippet(raw, length = 900) { return String(raw || "").replace(/\s+/g, " ").slice(0, length); }
async function readResponse(response) {
  const raw = await response.text();
  let json = null;
  try { json = JSON.parse(raw); } catch {}
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
  const result = { mode, status: response.status, ok, sessionId: json?.sessionId || "", checkoutUrl, error: json?.error || "", message: json?.message || "", bodySnippet: snippet(raw, 700) };
  if (!ok) fail(`Checkout session creation failed for ${product.sku} (${mode}).`, { sku: product.sku, result });
  return result;
}

async function checkSuccessPage(product) {
  const url = `${baseUrl}/checkout/success?session_id=cs_test_placeholder_for_ui_check&sku=${encodeURIComponent(product.sku)}`;
  const response = await fetch(url);
  const text = await response.text();
  const requiredStatic = [
    "Success! Your checkout is complete.",
    "data-download-panel",
    "What happens next:",
    "Your download options",
    "blank/editable templates"
  ];
  const requiredClientWiring = [
    "/api/verify-download",
    "Download editable Word document",
    "Optional: prefill a draft in the Studio",
    "Return to pricing and complete checkout"
  ];
  const missing = [...requiredStatic, ...requiredClientWiring].filter((token) => !text.includes(token));
  const ok = response.ok && missing.length === 0;
  const result = { status: response.status, ok, missing, bodySnippet: snippet(text, 900) };
  if (!ok) fail(`Checkout success page is missing required success/download/prefill UI for ${product.sku}: missing ${missing.join(", ") || "none"} status ${response.status}.`, { sku: product.sku, result });
  return result;
}

function completedSessionInputLooksFake() {
  return /REPLACE|PASTE|PLACEHOLDER|FIXME/i.test(completedSessionId);
}

async function verifyCompletedDownload() {
  if (!completedSessionId && !completedSku) return null;
  if (!completedSessionId || !completedSku) {
    fail("Both a completed Checkout Session ID and SKU are required for completed-session download proof.", { completedSessionIdProvided: !!completedSessionId, completedSkuProvided: !!completedSku });
    return { ok: false, reason: "missing_completed_session_inputs" };
  }
  if (completedSessionInputLooksFake()) {
    fail("Completed session input is still a placeholder. Paste a real cs_test_ or cs_live_ Checkout Session ID.", { completedSessionId });
    return { ok: false, reason: "placeholder_completed_session_id" };
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
    bodySnippet: snippet(raw, 1200)
  };
  if (!verification.ok) {
    fail(`Completed session did not verify or did not return both download links. HTTP ${response.status}; API status ${verification.apiStatus || "missing"}.`, { verification });
    return verification;
  }

  for (const filePath of files) {
    const fileUrl = new URL(filePath, `${baseUrl}/`).toString();
    const fileResponse = await fetch(fileUrl);
    const contentType = fileResponse.headers.get("content-type") || "";
    const disposition = fileResponse.headers.get("content-disposition") || "";
    const raw = fileResponse.ok ? "" : await fileResponse.text().catch(() => "");
    const ok = fileResponse.ok && /attachment/i.test(disposition) && /(pdf|officedocument|octet-stream)/i.test(contentType);
    const fileResult = { path: filePath, status: fileResponse.status, ok, contentType, contentDisposition: disposition, bodySnippet: snippet(raw, 600) };
    verification.files.push(fileResult);
    if (!ok) fail(`Protected download link did not return an attachment file. HTTP ${fileResponse.status}; ${filePath}`, { sku: completedSku, fileResult });
  }

  verification.ok = verification.files.length >= 2 && verification.files.every((item) => item.ok);
  return verification;
}

async function runFulfillmentFixture() {
  const originalFetch = globalThis.fetch;
  const fixtureSession = {
    id: "cs_test_fixture_completed_zero_dollar",
    status: "complete",
    payment_status: "no_payment_required",
    amount_total: 0,
    currency: "usd",
    metadata: { sku: "letter-of-explanation", product_id: "letter-of-explanation" },
    client_reference_id: "letter-of-explanation"
  };
  const d1Throws = { prepare() { throw new Error("fixture D1 unavailable"); } };
  const r2 = { async get(key) { return key === "downloads/letter-of-explanation.pdf" || key === "downloads/letter-of-explanation.docx" ? { body: new Blob(["fixture file"]) } : null; } };
  globalThis.fetch = async (url) => {
    if (String(url).includes("api.stripe.com/v1/checkout/sessions/")) return new Response(JSON.stringify(fixtureSession), { status: 200, headers: { "content-type": "application/json" } });
    return originalFetch(url);
  };
  try {
    const verifyResponse = await verifyDownload({
      request: new Request("https://fixture.local/api/verify-download", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: fixtureSession.id, sku: "letter-of-explanation" }) }),
      env: { STRIPE_SECRET_KEY: "sk_test_fixture", PRODUCTS_DB: d1Throws }
    });
    const verifyJson = await verifyResponse.json();
    const pdfResponse = await downloadFile({ request: new Request(`https://fixture.local/api/download-file?session_id=${fixtureSession.id}&type=pdf`), env: { STRIPE_SECRET_KEY: "sk_test_fixture", PRODUCTS_DB: d1Throws, PRODUCT_ASSETS_R2: r2 } });
    const docxResponse = await downloadFile({ request: new Request(`https://fixture.local/api/download-file?session_id=${fixtureSession.id}&type=docx`), env: { STRIPE_SECRET_KEY: "sk_test_fixture", PRODUCTS_DB: d1Throws, PRODUCT_ASSETS_R2: r2 } });
    const result = {
      ok: verifyResponse.ok && verifyJson.status === "VERIFIED" && pdfResponse.ok && docxResponse.ok,
      verifyStatus: verifyResponse.status,
      verifyApiStatus: verifyJson.status,
      entitlementRecorded: verifyJson.entitlementRecorded,
      warningPresent: Boolean(verifyJson.warning),
      pdfStatus: pdfResponse.status,
      docxStatus: docxResponse.status,
      boundary: "mocked Stripe complete/no_payment_required session plus D1 failure plus R2 attachment fetch"
    };
    if (!result.ok) fail("Fixture fulfillment fallback failed.", { fixture: result });
    return result;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

if (!fixtureOnly) {
  for (const product of products) {
    report.products.push({
      sku: product.sku,
      name: product.name,
      fullPriceCheckout: await createCheckoutSession(product, "full_price"),
      discountCheckout: skipDiscount ? { skipped: true } : await createCheckoutSession(product, "discount"),
      successPage: await checkSuccessPage(product)
    });
  }
  report.completedSession = await verifyCompletedDownload();
}
if (runFixture) report.fixture = await runFulfillmentFixture();

report.failures = failures;
report.status = failures.length
  ? "FAIL"
  : completedSessionId
    ? "PASS_COMPLETED_CHECKOUT_AND_PROTECTED_DOWNLOAD_PROOF"
    : runFixture
      ? "PASS_CHECKOUT_CREATION_SUCCESS_UI_AND_FIXTURE_FULFILLMENT"
      : "PASS_CHECKOUT_CREATION_AND_SUCCESS_UI_ONLY";

mkdirSync("reports/ops", { recursive: true });
writeFileSync("reports/ops/local-checkout-download-e2e.json", JSON.stringify(report, null, 2) + "\n");

if (failures.length) {
  for (const item of failures) console.error(`[local-checkout-e2e] ${item.message}`);
  console.error(`[local-checkout-e2e] Report written to reports/ops/local-checkout-download-e2e.json`);
  process.exit(1);
}

console.log(`[local-checkout-e2e] ${report.status} products=${report.products.length}${completedSessionId ? " completedSession=checked" : " completedSession=not-provided"}${runFixture ? " fixture=checked" : ""}`);

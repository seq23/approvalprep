#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fail, readJson } from "./_common.mjs";

const products = readJson("data/products/products.json").products.filter((item) => item.status === "active_paid" && item.stripe_enabled);
const offeringCatalog = readJson("data/products/full_offering_catalog.json");
const seedProducts = readJson("data/products/seed_product_registry.json").products || [];
const routes = new Set(readJson("data/routes/route_manifest.json").routes.map((route) => route.path));
const pricingPage = fs.readFileSync("src/pages/[...slug].astro", "utf8");
const homePage = fs.readFileSync("src/pages/index.astro", "utf8");
const checkout = fs.readFileSync("functions/api/create-checkout-session.js", "utf8");
const verify = fs.readFileSync("functions/api/verify-download.js", "utf8");
const download = fs.readFileSync("functions/api/download-file.js", "utf8");
const layout = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
const pricingDeck = fs.readFileSync("src/components/PricingDeck.astro", "utf8");
const productCard = fs.readFileSync("src/components/ProductValueCard.astro", "utf8");
const postPurchase = fs.readFileSync("src/components/WhatHappensAfterPurchase.astro", "utf8");
const studioPage = fs.readFileSync("src/pages/letter-writing-studio.astro", "utf8");
const studioComponent = fs.readFileSync("src/components/LetterStudio.astro", "utf8");
const deliveryMatrixPath = "docs/products/PRODUCT_DOWNLOAD_DELIVERY_MATRIX.md";
const deliveryMatrix = fs.existsSync(deliveryMatrixPath) ? fs.readFileSync(deliveryMatrixPath, "utf8") : "";
const failures = [];

function has(text, token, label) {
  if (!text.includes(token)) failures.push(label);
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function extractDocxText(file) {
  const data = fs.readFileSync(file);
  const eocd = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return "";
  const centralSize = data.readUInt32LE(eocd + 12);
  const centralOffset = data.readUInt32LE(eocd + 16);
  let offset = centralOffset;
  const end = centralOffset + centralSize;
  while (offset < end) {
    if (data.readUInt32LE(offset) !== 0x02014b50) break;
    const method = data.readUInt16LE(offset + 10);
    const compressedSize = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localHeaderOffset = data.readUInt32LE(offset + 42);
    const name = data.slice(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (name === "word/document.xml") {
      const localNameLength = data.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = data.readUInt16LE(localHeaderOffset + 28);
      const payloadStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const payload = data.slice(payloadStart, payloadStart + compressedSize);
      const xml = (method === 0 ? payload : zlib.inflateRawSync(payload)).toString("utf8");
      return normalize(xml.replace(/<[^>]+>/g, " "));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return "";
}

function routeFor(product) {
  return `/${product.sku}`;
}

const routeAliases = {
  "letter-of-explanation": "/letter-of-explanation",
  "income-employment-letter-kit": "/income-employment-letter-kit",
  "credit-letter-kit": "/credit-letter-kit",
  "rental-application-kit": "/rental-application-kit",
  "loan-prep-letter-kit": "/loan-prep-letter-kit",
  "business-funding-prep-kit": "/business-funding-prep-kit",
  "life-admin-letter-kit": "/life-admin-letter-kit",
  "complete-approvalprep-bundle": "/complete-approvalprep-bundle"
};

const report = {
  status: "PASS",
  ranAt: new Date().toISOString(),
  model: "direct_paid_download_with_optional_browser_only_prefill",
  productCount: products.length,
  testCode: {
    code: "TEST100",
    sourceOfTruth: "Stripe promotion code, created in Stripe test mode as 100% off and active",
    expectedCheckoutResult: "completed Checkout Session with payment_status=no_payment_required and amount_total=0",
    expectedFulfillmentResult: "verify-download returns protected PDF and DOCX download links"
  },
  products: []
};

has(pricingPage, "data-discount-code", "pricing page missing discount-code input");
has(checkout, "promotion_codes", "checkout runtime missing Stripe promotion-code lookup");
has(checkout, "allow_promotion_codes", "checkout runtime missing Stripe Checkout promotion-code field");
has(verify, "no_payment_required", "verify runtime missing 100% off completed-session unlock");
has(verify, "findPaidEntitlement", "verify runtime missing entitlement fallback");
has(download, "download_entitlements", "download-file missing entitlement guard");
has(layout, "Optional: prefill a draft in the Studio", "success page missing optional Studio prefill CTA");
has(pricingDeck, "fill-in placeholders", "pricing cards missing fill-in placeholder clarity");
has(productCard, "How filling works", "product cards missing fill-flow explanation");
has(postPurchase, "Choose how to fill it", "post-purchase section missing fill-choice explanation");
has(studioPage + studioComponent, "does not store", "Studio missing no-storage copy");
has(deliveryMatrix, "Product Download Delivery Matrix", "download delivery matrix doc missing");
has(deliveryMatrix, "Complete ApprovalPrep Bundle", "download delivery matrix missing Complete Bundle");
has(deliveryMatrix, "Offering rows in kit", "download delivery matrix missing offering-count column");

for (const product of products) {
  const seed = seedProducts.find((item) => item.slug === product.sku || item.id === product.sku);
  const route = routeAliases[product.sku] || routeFor(product);
  const issues = [];
  const needs = [];

  if (!routes.has(route)) issues.push("product page route missing");
  if (!routes.has("/pricing")) issues.push("pricing route missing");
  if (!routes.has("/checkout/success")) issues.push("checkout success route missing");
  if (!routes.has("/letter-writing-studio")) issues.push("optional Studio route missing");
  if (!product.priceLabel || !product.cta_label?.includes(product.priceLabel)) issues.push("CTA must include price");
  if (product.delivery_model !== "direct_paid_download") issues.push("delivery model must be direct_paid_download");
  if (product.studio_required !== false) issues.push("Studio must be optional, not purchase-gated");
  if (!product.checkout_result?.includes("Stripe payment")) issues.push("checkout result must explain Stripe verification");
  if (!product.included_offerings?.length) issues.push("included offerings missing");
  if (product.sku === "complete-approvalprep-bundle" && (product.included_offerings.length < 30 || product.included_offerings.includes("all active self-service offerings"))) {
    issues.push("complete bundle must visibly list the included offering universe, not a vague one-row placeholder");
  }
  if (!deliveryMatrix.includes(`seed-downloads/${product.sku}.pdf`) || !deliveryMatrix.includes(`seed-downloads/${product.sku}.docx`)) {
    issues.push("download delivery matrix must list both PDF and DOCX review files");
  }
  if (!deliveryMatrix.includes(`downloads/${product.sku}.pdf`) || !deliveryMatrix.includes(`downloads/${product.sku}.docx`)) {
    issues.push("download delivery matrix must list both production R2 keys");
  }
  if (!deliveryMatrix.includes(`../../seed-downloads/${product.sku}.pdf`) || !deliveryMatrix.includes(`../../seed-downloads/${product.sku}.docx`)) {
    issues.push("download delivery matrix links must resolve from docs/products to seed-downloads");
  }
  const catalogCategory = offeringCatalog.categories.find((category) => category.product_sku === product.sku);
  if (!catalogCategory) issues.push("full offering catalog category missing");
  if (catalogCategory && catalogCategory.offerings.length < product.included_offerings.length) {
    issues.push("full offering catalog has fewer offerings than public product data");
  }
  const docxPath = `seed-downloads/${product.sku}.docx`;
  const docxText = fs.existsSync(docxPath) ? extractDocxText(docxPath) : "";
  if (!docxText) issues.push("delivered DOCX text could not be read");
  for (const offering of product.included_offerings || []) {
    if (docxText && !docxText.includes(normalize(offering))) {
      issues.push(`delivered DOCX missing included offering "${offering}"`);
      break;
    }
  }
  if (product.sku === "complete-approvalprep-bundle" && docxText.includes("all active self-service offerings")) {
    issues.push("complete bundle DOCX still contains the vague all-active-offerings placeholder");
  }
  if (!product.trust_signals?.includes("No stored letter answers")) issues.push("no-stored-answers trust signal missing");
  if (!product.not_for?.length) issues.push("not_for boundary missing");
  if (!seed?.assets?.pdfKey && !seed?.pdfKey) issues.push("private PDF asset key missing in seed registry");
  if (!seed?.assets?.docxKey && !seed?.docxKey) issues.push("private DOCX asset key missing in seed registry");

  needs.push("Buyer can arrive from home Products grid, use-case rail, product page, or pricing page.");
  needs.push(`CTA should send SKU ${product.sku} and optional discount code only.`);
  needs.push("Stripe Checkout must create a payment session using the matching test/live price ID.");
  needs.push("For testing, enter TEST100 after creating it as an active 100% off Stripe test-mode promotion code.");
  needs.push("After completed payment or completed 100% off session, success page must unlock protected PDF and DOCX links.");
  needs.push("Buyer chooses either direct DOCX/PDF download or optional browser-only Studio prefill; no required pre-purchase intake.");
  needs.push("Buyer reviews placeholders, edits truthfully, attaches real documents where appropriate, and sends materials themselves.");

  report.products.push({
    sku: product.sku,
    name: product.name,
    price: product.priceLabel,
    route,
    includedOfferingCount: product.included_offerings?.length || 0,
    deliveryModel: product.delivery_model,
    studioRequired: product.studio_required,
    assets: {
      pdf: seed?.assets?.pdfKey || seed?.pdfKey || null,
      docx: seed?.assets?.docxKey || seed?.docxKey || null
    },
    journey: [
      "discover",
      "compare",
      "optional_discount_code",
      "stripe_checkout",
      "verified_success",
      "protected_download",
      "optional_browser_only_prefill",
      "customer_review_and_send"
    ],
    needs,
    issues
  });
  if (issues.length) failures.push(`${product.sku}: ${issues.join(", ")}`);
}

if (products.length !== 8) failures.push(`expected 8 paid products, found ${products.length}`);
if (failures.length) {
  report.status = "FAIL";
  report.failures = failures;
}

fs.mkdirSync(path.join(process.cwd(), "reports/ux"), { recursive: true });
fs.writeFileSync("reports/ux/product-flow-e2e-report.json", `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) fail(`[product-flow-e2e] ${failures.join("; ")}`);
console.log(`[product-flow-e2e] OK products=${products.length} report=reports/ux/product-flow-e2e-report.json`);

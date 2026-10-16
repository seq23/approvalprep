// Which kit a page's buy button sells. Pure, so the validator
// (scripts/validate/kit-page-sells-its-own-kit.mjs) can run it against every path.
//
// 16 Oct 2026: /life-admin-letter-kit/ sold the $15 Letter of Explanation kit,
// because no keyword below matches "life-admin" and the fallthrough won. A path
// that IS a paid kit's slug now sells that kit before any keyword is consulted.
export function skuForRoute(path, { priorityEntry = null, paidSkus = [] } = {}) {
  if (priorityEntry?.sku) return priorityEntry.sku;
  const slug = String(path || "").replace(/^\/+|\/+$/g, "");
  if (paidSkus.includes(slug)) return slug;
  if (path.includes("business") || path.includes("sba")) return "business-funding-prep-kit";
  if (path.includes("apartment") || path.includes("rental") || path.includes("approved-for-an-apartment")) return "rental-application-kit";
  if (path.includes("credit")) return "credit-letter-kit";
  if (path.includes("employment") || path.includes("income")) return "income-employment-letter-kit";
  if (path.includes("auto-loan") || path.includes("car-loan") || path.includes("mortgage") || path.includes("loan")) return "loan-prep-letter-kit";
  if (path.includes("moving") || path.includes("important-documents") || path.includes("life-admin")) return "life-admin-letter-kit";
  if (path.includes("complete-approvalprep-bundle")) return "complete-approvalprep-bundle";
  return "letter-of-explanation";
}

export function paidSkusFrom(productsJson) {
  const list = Array.isArray(productsJson) ? productsJson : productsJson.products;
  return list.filter((p) => p.status === "active_paid").map((p) => p.sku || p.slug || p.id).filter(Boolean);
}

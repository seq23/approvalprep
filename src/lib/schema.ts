import routeManifest from "../../data/routes/route_manifest.json";
import toolRegistry from "../../data/tools/tool_registry.json";
import templateRegistry from "../../data/templates/template_registry.json";
import reportRegistry from "../../data/reports/public_report_registry.json";
import editorial from "../data/editorial.json";
import entity from "../data/entity.json";
import reviewers from "../data/reviewers.json";

export const SITE_ORIGIN = "https://approvalprep.com";

// Cloudflare Pages serves this build's directory output (`foo/index.html`) as
// `/foo/` with a 200 and 308-redirects `/foo`. Every URL this site emits - a
// canonical tag, og:url, a breadcrumb item, a sitemap entry, an llms.txt line,
// and every internal <a href> - must name the form the server answers 200 for,
// or we hand a crawler a redirect.
//
// canonicalUrl() already covered the URLs we publish *to* crawlers. Nothing
// covered the ones we *link* with, so every internal href named the redirecting
// form and Google filed 123 destinations as "Page with redirect" instead of
// indexing them: the site pointed the crawler at redirects with its own
// navigation. internalHref() is that one rule, applied to hrefs.
//
// Route paths get the slash. Files must not: /robots.txt, /sitemap.xml,
// /answers/index.json and /downloads/x.pdf are served at exactly those URLs and
// /robots.txt/ is a 404. Off-site URLs, fragments, mailto: and tel: pass
// through untouched, so this is safe to wrap around any href expression
// whatever it turns out to hold. Query strings and fragments are preserved:
// /pricing#kit -> /pricing/#kit.
export const internalHref = (input: unknown): string => {
  const value = typeof input === "string" ? input : String(input ?? "");
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  const [beforeHash, ...hashRest] = value.split("#");
  const hash = hashRest.length ? `#${hashRest.join("#")}` : "";
  const [rawPath, ...queryRest] = beforeHash.split("?");
  const query = queryRest.length ? `?${queryRest.join("?")}` : "";
  const lastSegment = rawPath.split("/").pop() || "";
  if (/\.[a-z0-9]+$/i.test(lastSegment)) return value;
  const pathname = `${rawPath.replace(/\/+$/, "")}/`;
  return `${pathname}${query}${hash}`;
};

// The absolute form of the same rule. scripts/seo/generate-sitemap.mjs and
// scripts/validate/*.mjs apply it too; they cannot import a .ts module, so the
// rule is restated there rather than diverging silently.
export const canonicalUrl = (input: string) => {
  const url = new URL(String(input || "/"), SITE_ORIGIN);
  return `${SITE_ORIGIN}${internalHref(url.pathname)}${url.search}${url.hash}`;
};

// JSON-LD author for every Article. Same file as the visible Byline component.
// The Spry Labs parent, by @id, so an engine joins ApprovalPrep to the one Spry
// Labs entity on billionairehighperformancecoach.com/spry-labs rather than to a
// second, unnamed "Spry Labs". src/data/entity.json is its one source.
export const parentOrganizationNode = () => ({ "@type": "Organization", "@id": entity.parentOrganization["@id"], name: entity.parentOrganization.name, url: entity.parentOrganization.url });

export const editorialAuthor = () => ({ "@type": "Organization", name: editorial.name, url: canonicalUrl(editorial.aboutPath), parentOrganization: parentOrganizationNode() });

// Loan-document pages carry a named-reviewer slot (src/data/reviewers.json). It
// ships empty and stays empty until a real reviewer has agreed in writing; until
// then nothing is emitted and the visible byline names the editorial desk.
const pathOf = (url: string) => internalHref(new URL(url, SITE_ORIGIN).pathname);
export const isLoanDocumentPath = (url: string) => reviewers.loan_document_paths.includes(pathOf(url));
export const listedReviewers = () => reviewers.reviewers as Array<{ name: string; credential: string; url: string }>;
export const reviewedByFor = (url: string) =>
  isLoanDocumentPath(url) && listedReviewers().length
    ? listedReviewers().map((person) => ({ "@type": "Person", name: person.name, jobTitle: person.credential, url: person.url }))
    : null;

// The site-wide social share image (public/og.png, drawn by
// scripts/seo/generate-brand-assets.py). BaseLayout puts it on every page;
// scripts/validate/seo-hygiene.mjs checks the file's real dimensions match.
export const OG_IMAGE = { url: `${SITE_ORIGIN}/og.png`, width: 1200, height: 630, alt: "ApprovalPrep: self-service letters and approval-ready documents" };

// The one ApprovalPrep Organization node. Every Organization this site emits -
// the site-wide node in BaseLayout, orgSchema, and the `publisher` of every
// WebPage, Article and WebSite - is this object, so an engine that reads any of
// them reads the same entity.
//
// The Search Readiness checklist (item c1, 25 Oct 2026) found Organization on
// all thirteen sampled pages carrying only name and url: no logo, no sameAs, so
// nothing tied the pages to one citable thing. `logo` is public/icon-512.png,
// the 512x512 brand mark seo-hygiene already measures. `sameAs` lists profiles
// this business really owns and that really answer; add one only after it does.
//
// Since 30 Oct 2026 (authority audit) every field comes from src/data/entity.json,
// which also names the parent (Spry Labs, by @id) and the profiles still
// pending. scripts/validate/schema-entity-graph.mjs fails any page whose
// Organization drifts from that file; the weekly entity-backlink-watch removes
// a profile that stops resolving and promotes a pending one that starts to.
export const ORGANIZATION_SAME_AS: string[] = entity.sameAs;

export const organizationNode = () => ({
  "@type": "Organization",
  "@id": entity["@id"],
  name: entity.name,
  url: canonicalUrl("/"),
  logo: entity.logo,
  description: entity.description,
  sameAs: ORGANIZATION_SAME_AS,
  parentOrganization: parentOrganizationNode()
});

export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ApprovalPrep",
  url: canonicalUrl("/"),
  inLanguage: "en-US",
  publisher: organizationNode()
});

/**
 * WebPage whose speakable parts are named by CSS selectors. Each selector must
 * match an element on the built page (scripts/validate/seo-hygiene.mjs, check
 * `definition`), so a renamed id cannot leave the spec pointing at nothing.
 */
export const speakableWebPageSchema = ({ title, description, url, cssSelector }: { title: string; description: string; url: string; cssSelector: string[] }) => ({
  ...webPageSchema({ title, description, url }),
  isPartOf: { "@type": "WebSite", name: "ApprovalPrep", url: canonicalUrl("/") },
  speakable: { "@type": "SpeakableSpecification", cssSelector }
});

export const orgSchema = () => ({ "@context": "https://schema.org", ...organizationNode() });

export const webPageSchema = ({ title, description, url }: { title: string; description: string; url: string }) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url,
  publisher: organizationNode()
});

export const articleSchema = ({ title, description, url, datePublished }: { title: string; description: string; url: string; datePublished?: string }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  url,
  datePublished,
  author: editorialAuthor(),
  publisher: organizationNode(),
  ...(reviewedByFor(url) ? { mainEntityOfPage: { "@type": "WebPage", "@id": url, reviewedBy: reviewedByFor(url) } } : {})
});

export const faqSchema = (faq: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } }))
});

export const howToSchema = ({ name, steps }: { name: string; steps: string[] }) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  step: steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, text: step }))
});

// Every published surface that carries a title, keyed by its path. The trail is
// built from these rather than from the URL slug: a crumb named "letter of
// explanation large deposit" is a de-slugged guess, while the registries hold
// the page's own title. It also lets the trail skip a path segment that has no
// page behind it (/auto-loan, /templates/letters), instead of emitting a crumb
// that links to a 404.
const titleByPath = new Map<string, string>();
for (const route of (routeManifest as any).routes || []) titleByPath.set(route.path, route.title);
for (const tool of (toolRegistry as any).tools || []) titleByPath.set(tool.path, tool.title);
for (const template of (templateRegistry as any).templates || []) titleByPath.set(template.path, template.title);
for (const report of (reportRegistry as any).reports || []) titleByPath.set(report.path, report.title);

export const titleForPath = (path: string) => titleByPath.get(path) || "";

/**
 * Ordered breadcrumb trail for a path. Each entry is a real, existing page and
 * is named by that page's own title. `currentTitle` names the final crumb for
 * surfaces whose title lives outside the registries (blog posts).
 */
export const breadcrumbTrail = (path: string, currentTitle = "") => {
  const segments = path.split("/").filter(Boolean);
  const trail = [{ name: titleByPath.get("/") || "ApprovalPrep", url: "/" }];
  let accumulated = "";
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;
    const isLast = index === segments.length - 1;
    const name = (isLast && currentTitle) || titleByPath.get(accumulated);
    if (!name) return;
    trail.push({ name, url: accumulated });
  });
  return trail;
};

export const breadcrumbSchema = (path: string, currentTitle = "") => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: breadcrumbTrail(path, currentTitle).map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: canonicalUrl(crumb.url)
  }))
});

export const itemListSchema = ({ name, items }: { name: string; items: string[] }) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item }))
});

// Product rich result (Google Merchant listings + Product snippets): every node
// carries image, brand, sku and a real Offer priced from data/products/products.json.
// No review or aggregateRating is ever emitted: there are none to cite.
// Guarded by validate:seo-hygiene:jsonld (price must equal the kit price data).
type ProductInput = { sku: string; name: string; priceLabel: string; image?: string };
export const productSchema = ({ product, description, url }: { product: ProductInput; description: string; url: string }) => {
  const price = String(product.priceLabel || "").replace(/[^0-9.]/g, "");
  if (!product.sku || !price) throw new Error(`productSchema: ${product.name || "product"} has no sku or price`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    sku: product.sku,
    url,
    image: product.image ? `${SITE_ORIGIN}${product.image}` : OG_IMAGE.url,
    brand: { "@type": "Brand", name: "ApprovalPrep" },
    offers: { "@type": "Offer", priceCurrency: "USD", price, availability: "https://schema.org/InStock", url }
  };
};

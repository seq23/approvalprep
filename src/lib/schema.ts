import routeManifest from "../../data/routes/route_manifest.json";
import toolRegistry from "../../data/tools/tool_registry.json";
import templateRegistry from "../../data/templates/template_registry.json";
import reportRegistry from "../../data/reports/public_report_registry.json";

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

export const orgSchema = () => ({ "@context": "https://schema.org", "@type": "Organization", name: "ApprovalPrep", url: canonicalUrl("/") });

export const webPageSchema = ({ title, description, url }: { title: string; description: string; url: string }) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url,
  publisher: { "@type": "Organization", name: "ApprovalPrep", url: "https://approvalprep.com" }
});

export const articleSchema = ({ title, description, url, datePublished }: { title: string; description: string; url: string; datePublished?: string }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  url,
  datePublished,
  author: { "@type": "Organization", name: "ApprovalPrep" },
  publisher: { "@type": "Organization", name: "ApprovalPrep", url: "https://approvalprep.com" }
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

export const productSchema = ({ name, description, url, price }: { name: string; description: string; url: string; price?: string }) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name,
  description,
  url,
  ...(price ? { offers: { "@type": "Offer", priceCurrency: "USD", price: price.replace(/[^0-9.]/g, "") } } : {})
});

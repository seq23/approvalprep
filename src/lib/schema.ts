import routeManifest from "../../data/routes/route_manifest.json";
import toolRegistry from "../../data/tools/tool_registry.json";
import templateRegistry from "../../data/templates/template_registry.json";
import reportRegistry from "../../data/reports/public_report_registry.json";

export const SITE_ORIGIN = "https://approvalprep.com";

// Cloudflare Pages serves this build's directory output (`foo/index.html`) as
// `/foo/` with a 200 and 308-redirects `/foo`. Every public URL we publish -
// canonical tags, og:url, breadcrumb items, sitemap entries - must therefore
// name the trailing-slash form, or we point crawlers at a redirect. This is the
// single rule; scripts/seo/generate-sitemap.mjs applies the same one.
export const canonicalUrl = (input: string) => {
  const url = new URL(String(input || "/"), SITE_ORIGIN);
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${SITE_ORIGIN}${pathname}/${url.search}${url.hash}`;
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

import type { APIRoute } from "astro";
import manifest from "../../data/routes/route_manifest.json";
import generated from "../../data/content/generated_answers.json";
import pageRegistry from "../../data/content/page_registry.json";
import toolRegistry from "../../data/tools/tool_registry.json";
import templateRegistry from "../../data/templates/template_registry.json";
import reportRegistry from "../../data/reports/public_report_registry.json";
import { canonicalUrl } from "../lib/schema";
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
export const GET: APIRoute = async () => {
  const routes = manifest.routes.filter((route) => route.index && route.type !== "admin").map((route) => ({ type: "route", url: canonicalUrl(route.path), title: route.title, family: route.family, risk: route.risk, primaryQuery: route.primaryQuery || null }));
  const blog = generated.answers.filter((item) => item.status === "published_by_contract").map((item) => ({ type: "blog_answer", url: canonicalUrl(`/blog/${slugify(item.title)}`), title: item.title, risk: item.riskLevel, relatedRoute: item.route }));
  // Only pages that are actually built. Listing an approval-blocked record
  // advertised /credit-dispute-letter/collections/ to crawlers and answer
  // engines as a live URL when nothing is served there.
  const pages = pageRegistry.pages.filter((page) => page.status === "published_by_contract").map((page) => ({ type: "page_factory_record", url: canonicalUrl(page.path), title: page.title, status: page.status, risk: page.risk, primaryQuery: page.primaryQuery || null }));
  const tools = toolRegistry.tools.filter((tool) => tool.status === "published_by_contract").map((tool) => ({ type: "tool", url: canonicalUrl(tool.path), title: tool.title, risk: tool.risk, primaryQuery: tool.primaryQuery, targetProductSku: tool.targetProductSku }));
  const templates = templateRegistry.templates.filter((template) => template.status === "published_by_contract").map((template) => ({ type: "template", url: canonicalUrl(template.path), title: template.title, risk: template.risk, primaryQuery: template.primaryQuery, targetProductSku: template.targetProductSku }));
  const reports = reportRegistry.reports.filter((report) => report.status === "published_by_contract").map((report) => ({ type: "public_report", url: canonicalUrl(report.path), title: report.title, risk: report.risk, primaryQuery: report.primaryQuery, sourceIds: report.sourceIds }));
  return new Response(JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), routes, blog, pages, tools, templates, reports }, null, 2), { headers: { "content-type": "application/json" } });
};

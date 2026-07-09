import type { APIRoute } from "astro";
import generated from "../../data/content/generated_answers.json";
import pageRegistry from "../../data/content/page_registry.json";
import toolRegistry from "../../data/tools/tool_registry.json";
import templateRegistry from "../../data/templates/template_registry.json";
import reportRegistry from "../../data/reports/public_report_registry.json";
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
const esc = (value: string) => value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
export const GET: APIRoute = async () => {
  const items = [
    ...generated.answers.filter((item) => item.status === "published_by_contract").map((item) => ({ title: item.title, url: `https://approvalprep.com/blog/${slugify(item.title)}`, description: item.answer, date: generated.generatedAt })),
    ...pageRegistry.pages.filter((page) => page.status === "published_by_contract").map((page) => ({ title: page.title, url: `https://approvalprep.com${page.path}`, description: `Self-service ApprovalPrep guide for ${page.primaryQuery || page.title}.`, date: page.generatedAt })),
    ...toolRegistry.tools.filter((tool) => tool.status === "published_by_contract").map((tool) => ({ title: tool.title, url: `https://approvalprep.com${tool.path}`, description: tool.summary, date: toolRegistry.generatedAt })),
    ...templateRegistry.templates.filter((template) => template.status === "published_by_contract").map((template) => ({ title: template.title, url: `https://approvalprep.com${template.path}`, description: template.summary, date: templateRegistry.generatedAt })),
    ...reportRegistry.reports.filter((report) => report.status === "published_by_contract").map((report) => ({ title: report.title, url: `https://approvalprep.com${report.path}`, description: report.summary, date: reportRegistry.generatedAt }))
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ApprovalPrep Publishing Feed</title><link>https://approvalprep.com/blog</link><description>ApprovalPrep self-service document prep publishing.</description>${items.map((item) => `<item><title>${esc(item.title)}</title><link>${item.url}</link><guid>${item.url}</guid><pubDate>${new Date(item.date).toUTCString()}</pubDate><description>${esc(item.description)}</description></item>`).join("")}</channel></rss>`, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
};

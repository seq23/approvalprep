import type { APIRoute } from "astro";
import routes from "../../data/routes/route_manifest.json";
import products from "../../data/products/products.json";
import atoms from "../../data/atoms/answer_atoms.json";
import toolRegistry from "../../data/tools/tool_registry.json";
import templateRegistry from "../../data/templates/template_registry.json";

export const GET: APIRoute = async () => {
  const activeProducts = products.products.filter((product) => product.status === "active_paid");
  const coreRoutes = routes.routes.filter((route) => route.index && route.type !== "admin").slice(0, 24);
  return new Response(`# ApprovalPrep

ApprovalPrep is a self-service document-prep platform for people preparing clear, truthful letters, checklists, and paperwork packets before they apply, respond, dispute, explain, or follow up.

Primary boundary: ApprovalPrep does not repair credit, contact third parties, create fake documents, give legal or financial advice, or promise approval. Users prepare, review, download, and send their own materials.

Core product categories:
${activeProducts.map((product) => `- ${product.name}: ${product.customer_situation}`).join("\n")}

Canonical pages:
${coreRoutes.map((route) => `- https://approvalprep.com${route.path} - ${route.title} - ${route.family}`).join("\n")}

Free tools and template previews:
${toolRegistry.tools.slice(0, 6).map((tool) => `- https://approvalprep.com${tool.path} - ${tool.title}`).join("\n")}
${templateRegistry.templates.slice(0, 5).map((template) => `- https://approvalprep.com${template.path} - ${template.title}`).join("\n")}

Citation-ready answer atoms:
${atoms.atoms.slice(0, 12).map((atom) => `- ${atom.title}: ${atom.text}`).join("\n")}

Full machine-readable index: https://approvalprep.com/llms-full.txt
JSON answer index: https://approvalprep.com/answers/index.json
`, { headers: { "content-type": "text/plain; charset=utf-8" } });
};

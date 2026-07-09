import type { APIRoute } from "astro";
import routes from "../../data/routes/route_manifest.json";
import products from "../../data/products/products.json";
import atoms from "../../data/atoms/answer_atoms.json";
import claims from "../../data/citations/claim_registry.json";
import sources from "../../data/citations/source_registry.json";

export const GET: APIRoute = async () => new Response(`# ApprovalPrep Full LLM Index

## Identity
ApprovalPrep is a self-service document-prep platform. It helps users prepare clear, truthful letters, checklists, and document packets before they apply, respond, dispute, explain, or follow up.

## Boundaries
- No credit repair service.
- No third-party contact.
- No fake paystubs, fake employment, fake income, fake rental documents, or fake offer letters.
- No legal, financial, lending, accounting, or tax advice.
- No approval guarantees.
- Users review, download, and send their own materials.

## Products
${products.products.filter((product) => product.status === "active_paid").map((product) => `### ${product.name}
Path: https://approvalprep.com/${product.sku}
Price: ${product.priceLabel}
Best for: ${product.customer_situation}
Outcome: ${product.outcome}
Includes: ${(product.includes || []).join("; ")}
Not for: ${(product.not_for || product.notFor || []).join("; ")}
`).join("\n")}

## Routes
${routes.routes.filter((route) => route.type !== "admin").map((route) => `- https://approvalprep.com${route.path} | ${route.title} | family=${route.family} | risk=${route.risk} | index=${route.index}`).join("\n")}

## Answer Atoms
${atoms.atoms.map((atom) => `### ${atom.title}
Atom: ${atom.atom_id}
Type: ${atom.atom_type}
Owner: https://approvalprep.com${atom.route_owner}
Text: ${atom.text}
Claims: ${(atom.claim_ids || []).join(", ") || "none"}
`).join("\n")}

## Claims
${claims.claims.map((claim) => `- ${claim.claim_id}: ${claim.claim_text} | risk=${claim.risk_class} | sources=${claim.source_ids.join(", ")}`).join("\n")}

## Sources
${sources.sources.map((source) => `- ${source.source_id}: ${source.source_name} (${source.url})`).join("\n")}
`, { headers: { "content-type": "text/plain; charset=utf-8" } });

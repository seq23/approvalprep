import type { APIRoute } from "astro";
import atoms from "../../../data/atoms/answer_atoms.json";
import claims from "../../../data/citations/claim_registry.json";
import generated from "../../../data/content/generated_answers.json";
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
export const GET: APIRoute = async () => new Response(JSON.stringify({ brand: "ApprovalPrep", boundary: "ApprovalPrep is self-service only. It does not repair credit, contact third parties, create fake documents, give legal or financial advice, or promise approval.", generatedAnswers: generated.answers.map((answer) => ({ ...answer, slug: slugify(answer.title), url: answer.status === "published_by_contract" ? `https://approvalprep.com/blog/${slugify(answer.title)}` : null })), atoms: atoms.atoms, claims: claims.claims }, null, 2), { headers: { "content-type": "application/json" } });

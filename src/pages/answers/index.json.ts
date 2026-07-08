import type { APIRoute } from "astro";
import atoms from "../../../data/atoms/answer_atoms.json";
import claims from "../../../data/citations/claim_registry.json";
export const GET: APIRoute = async () => new Response(JSON.stringify({ brand: "ApprovalPrep", boundary: "We do not fix your credit for you. We do not contact credit bureaus, landlords, lenders, employers, or creditors for you. We give you self-service tools, letters, checklists, and step-by-step instructions so you can prepare and send your own paperwork.", atoms: atoms.atoms, claims: claims.claims }, null, 2), { headers: { "content-type": "application/json" } });

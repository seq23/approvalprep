import type { APIRoute } from "astro";
import targets from "../../data/atoms/citation_targets.json";
import atoms from "../../data/atoms/answer_atoms.json";
export const GET: APIRoute = async () => new Response(JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), boundary: "Citation targets are opportunity surfaces, not proof of external citations. ApprovalPrep does not claim ranking, indexing, or citation wins without telemetry.", targets: targets.targets, atoms: atoms.atoms.filter((atom) => !(atom.forbidden_contexts || []).includes("credit_repair_service_claim")) }, null, 2), { headers: { "content-type": "application/json" } });

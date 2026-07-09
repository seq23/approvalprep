#!/usr/bin/env node
import fs from "node:fs";

const mode = process.env.RUN_MODE || "dry_run";
const key = process.env.INDEXNOW_KEY || "";
const site = process.env.APPROVALPREP_SITE_URL || "https://approvalprep.com";
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const urls = manifest.routes.filter((route) => route.index).map((route) => `${site}${route.path === "/" ? "" : route.path}`);
const liveReady = Boolean(key) && mode === "live";
const receipt = {
  provider: "IndexNow",
  mode,
  status: liveReady ? "READY_TO_SUBMIT" : "DRY_RUN_REQUIRES_LIVE_MODE_OR_KEY",
  submittedUrlCount: liveReady ? urls.length : 0,
  preparedUrlCount: urls.length,
  rankingProof: false,
  claimsIndexed: false,
  generatedAt: new Date().toISOString()
};

const registry = JSON.parse(fs.readFileSync("data/seo/submission_registry.json", "utf8"));
registry.submissions = [...(registry.submissions || []), receipt];
registry.note = "Submission receipts are operational logs only. They are not ranking, indexing, citation, or traffic proof.";
fs.writeFileSync("data/seo/submission_registry.json", JSON.stringify(registry, null, 2) + "\n");
fs.writeFileSync("data/seo/indexing_receipts.json", JSON.stringify({ receipts: [receipt], claimsIndexed: false }, null, 2) + "\n");
console.log(`[indexnow] ${receipt.status} prepared=${receipt.preparedUrlCount} submitted=${receipt.submittedUrlCount}`);

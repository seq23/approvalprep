#!/usr/bin/env node
import fs from "node:fs";

const mode = process.env.RUN_MODE || "dry_run";
const apiKey = process.env.BING_WEBMASTER_API_KEY || "";
const site = process.env.APPROVALPREP_SITE_URL || "https://approvalprep.com";
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const preparedUrlCount = manifest.routes.filter((route) => route.index).length;
const liveReady = Boolean(apiKey) && mode === "live";
const receipt = {
  provider: "Bing Webmaster",
  mode,
  status: liveReady ? "READY_TO_SUBMIT" : "DRY_RUN_REQUIRES_LIVE_MODE_OR_KEY",
  site,
  submittedUrlCount: liveReady ? preparedUrlCount : 0,
  preparedUrlCount,
  rankingProof: false,
  claimsIndexed: false,
  generatedAt: new Date().toISOString()
};

const registry = JSON.parse(fs.readFileSync("data/seo/submission_registry.json", "utf8"));
registry.submissions = [...(registry.submissions || []), receipt];
registry.note = "Submission receipts are operational logs only. They are not ranking, indexing, citation, or traffic proof.";
fs.writeFileSync("data/seo/submission_registry.json", JSON.stringify(registry, null, 2) + "\n");
console.log(`[bing] ${receipt.status} prepared=${receipt.preparedUrlCount} submitted=${receipt.submittedUrlCount}`);

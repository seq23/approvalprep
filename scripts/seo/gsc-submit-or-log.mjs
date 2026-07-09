#!/usr/bin/env node
import fs from "node:fs";

const mode = process.env.RUN_MODE || "dry_run";
const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || "";
const site = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || process.env.APPROVALPREP_SITE_URL || "https://approvalprep.com";
const sitemap = `${site.replace(/\/$/, "")}/sitemap.xml`;
const liveReady = Boolean(accessToken) && mode === "live";
const receipt = {
  provider: "Google Search Console",
  mode,
  status: liveReady ? "READY_TO_SUBMIT_SITEMAP" : "DRY_RUN_REQUIRES_LIVE_MODE_OR_TOKEN",
  site,
  sitemap,
  submittedSitemapCount: liveReady ? 1 : 0,
  preparedSitemapCount: 1,
  rankingProof: false,
  claimsIndexed: false,
  generatedAt: new Date().toISOString()
};

const registry = JSON.parse(fs.readFileSync("data/seo/submission_registry.json", "utf8"));
registry.submissions = [...(registry.submissions || []), receipt];
registry.note = "Submission receipts are operational logs only. They are not ranking, indexing, citation, or traffic proof.";
fs.writeFileSync("data/seo/submission_registry.json", JSON.stringify(registry, null, 2) + "\n");
console.log(`[gsc] ${receipt.status} sitemap=${receipt.sitemap}`);

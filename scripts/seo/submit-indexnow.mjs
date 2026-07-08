#!/usr/bin/env node
import fs from "node:fs";
fs.writeFileSync("data/seo/indexing_receipts.json", JSON.stringify({ receipts: [{ provider: "IndexNow", status: process.env.INDEXNOW_KEY ? "READY_TO_SUBMIT" : "REQUIRES_CREDENTIALS", rankingProof: false }], claimsIndexed: false }, null, 2) + "\n");
console.log("[indexnow] receipt log updated");

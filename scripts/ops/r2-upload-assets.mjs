#!/usr/bin/env node
// Uploads the paid kit files from APPROVALPREP_KITS_DIR (default
// ~/.boss-os/approvalprep/kits; they are not in this public repository) to the
// private R2 bucket buyers download from. Refuses with a named stop when the
// folder is missing ([KITS_DIR_MISSING]) or any file fails the kit safety
// checks ([KIT_FIRST_PAGE_UNSAFE]); see scripts/ops/lib/upload-kits.mjs.
import { uploadKits, gateKitsForUpload } from "./lib/upload-kits.mjs";

const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "approvalprep-product-assets";

if (process.argv.includes("--check")) {
  // The gate alone, for a dry look before an upload. Uploads nothing.
  gateKitsForUpload();
} else {
  uploadKits(bucketName);
}

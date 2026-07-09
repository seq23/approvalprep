#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { run } from "./lib/exec.mjs";

const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "approvalprep-product-assets";
const dir = process.env.APPROVALPREP_SEED_DOWNLOADS_DIR || "seed-downloads";

if (!fs.existsSync(dir)) throw new Error(`${dir} missing`);

const files = fs.readdirSync(dir)
  .filter((file) => /\.(pdf|docx)$/i.test(file))
  .sort();

if (!files.length) throw new Error(`${dir} contains no PDF or DOCX files`);

for (const file of files) {
  const local = path.join(dir, file);
  const sku = file.replace(/\.(pdf|docx)$/i, "");
  const key = `products/${sku}/${file}`;
  run("npx", [
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucketName}/${key}`,
    "--file",
    local,
    "--remote"
  ]);
}

console.log(`R2 product assets uploaded remotely: ${bucketName} files=${files.length}`);

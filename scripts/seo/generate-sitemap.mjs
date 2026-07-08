#!/usr/bin/env node
import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const urls = manifest.routes.filter((r) => r.index).map((r) => `  <url><loc>https://approvalprep.com${r.path === "/" ? "" : r.path}</loc></url>`).join("\n");
fs.writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log("[sitemap] OK");

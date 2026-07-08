import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function fail(message) { console.error(message); process.exit(1); }
function walk(dir) { const full = path.join(root, dir); if (!fs.existsSync(full)) return []; const out = []; for (const entry of fs.readdirSync(full, { withFileTypes: true })) { const next = path.join(full, entry.name); if (entry.isDirectory()) out.push(...walk(path.relative(root, next))); else out.push(next); } return out; }
export { root, readJson, exists, fail, walk };

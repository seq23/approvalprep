#!/usr/bin/env node
// validate:workflow-deps-installed - a workflow that runs an npm script needing
// node_modules must install them first.
//
// Why (27 Oct 2026): Weekly Growth Ops went red from 26 Oct with
// `sh: 1: astro: not found` / `[search-intelligence:derive] FAIL build exited 127`.
// #54 (19 Oct) added `npm run search-intelligence:derive` to it; derive-ledgers.mjs
// spawns `npm run build` (astro), and the workflow never ran `npm ci`. Most
// workflows here deliberately skip the install because their scripts use only
// node builtins, so the rule is not "always install": it is "install when any
// script you run reaches a node_modules binary".
//
// A script needs dependencies when its command invokes a node_modules/.bin
// binary, runs `npm run <x>` / `npm exec` for a script that does, or is a node
// script that spawns a child process and names such a script as a string
// literal (derive-ledgers.mjs: DERIVE_STEPS = [..., "build", ...]).
// Hard-fails when a workflow runs such a script with no `npm ci`/`npm install`
// before it, or when the check examined no workflow (Rule 0).
import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const scripts = pkg.scripts || {};
const deps = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
// Binaries the declared packages provide, read from their own package.json so
// the check works on a runner with no node_modules.
const bins = new Set();
for (const dep of deps) {
  const file = path.join("node_modules", dep, "package.json");
  if (fs.existsSync(file)) {
    const bin = JSON.parse(fs.readFileSync(file, "utf8")).bin;
    if (typeof bin === "string") bins.add(dep.split("/").pop());
    else if (bin) for (const name of Object.keys(bin)) bins.add(name);
  } else bins.add(dep.split("/").pop());
}
const errors = [];
const memo = new Map();
export function needsDeps(name, seen = new Set()) {
  if (memo.has(name)) return memo.get(name);
  if (seen.has(name) || !scripts[name]) return false;
  seen.add(name);
  const cmd = scripts[name];
  let result = false;
  for (const part of cmd.split(/&&|\|\||;|\|/)) {
    const words = part.trim().split(/\s+/).filter((w) => !/^[A-Z_]+=/.test(w));
    if (!words.length) continue;
    if (bins.has(words[0]) || words[0] === "npx") { result = true; break; }
    if (words[0] === "npm" && words[1] === "run" && needsDeps(words[2], seen)) { result = true; break; }
    if (words[0] === "node" && words[1] && fs.existsSync(words[1])) {
      const src = fs.readFileSync(words[1], "utf8");
      if (/spawnSync|execSync|spawn\(|exec\(/.test(src)) {
        const named = [...src.matchAll(/["'`]([a-z0-9:_-]+)["'`]/gi)].map((m) => m[1]).filter((s) => s !== name && scripts[s]);
        if (named.some((s) => needsDeps(s, seen))) { result = true; break; }
      }
    }
  }
  memo.set(name, result);
  return result;
}

const dir = ".github/workflows";
let examined = 0;
for (const file of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  examined += 1;
  const lines = fs.readFileSync(path.join(dir, file), "utf8").split("\n");
  let installedAt = -1;
  const code = (line) => line.replace(/(^|\s)#.*$/, "");
  lines.forEach((line, i) => { if (installedAt < 0 && /\bnpm (ci|install)\b/.test(code(line))) installedAt = i; });
  lines.forEach((raw, i) => {
    const line = code(raw);
    for (const m of line.matchAll(/\bnpm run ([a-z0-9:_-]+)/gi)) {
      if (needsDeps(m[1]) && (installedAt < 0 || installedAt > i)) errors.push(`${file}:${i + 1} runs "npm run ${m[1]}", which reaches a node_modules binary, with no npm ci before it`);
    }
  });
}
if (!examined) errors.push("examined 0 workflows; this check is inert");
if (!needsDeps("build")) errors.push("self-test: `build` (astro) is not detected as needing dependencies");
if (!needsDeps("search-intelligence:derive")) errors.push("self-test: search-intelligence:derive (spawns build) is not detected as needing dependencies");

if (errors.length) { console.error(`[workflow-deps-installed] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[workflow-deps-installed] OK workflows=${examined} binaries=${bins.size}`);

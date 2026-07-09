import fs from "node:fs";
import path from "node:path";

export function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function arr(value, key) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  return [];
}

export function countPublicRoutes(manifest) {
  return arr(manifest, "routes").filter((route) => route.type === "public" && route.index !== false).length;
}

export function liveMode(source) {
  const mode = String(source?.mode || source?.status || "unknown").toLowerCase();
  return mode === "live" || mode === "real" || mode === "connected";
}

export function sourceState(name, source) {
  return {
    name,
    mode: source?.mode || source?.status || "unavailable",
    fetchedAt: source?.fetchedAt || source?.generatedAt || source?.updatedAt || null,
    live: liveMode(source),
    note: liveMode(source) ? "live provider data present" : "not live provider data; do not claim live performance"
  };
}

export function metricItem(label, value, source = "repo_static", claimType = "structural") {
  return { label, value, source, claimType };
}

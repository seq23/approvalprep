import fs from "node:fs";
import crypto from "node:crypto";
export const now = () => new Date().toISOString();
export function readJson(path, fallback={}) { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path,"utf8")) : fallback; }
export function writeJson(path, value) { fs.mkdirSync(path.split('/').slice(0,-1).join('/'), {recursive:true}); fs.writeFileSync(path, JSON.stringify(value,null,2)+"\n"); }
export function textOf(obj) { return JSON.stringify(obj).toLowerCase(); }
export function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16); }
export function patterns(registry, key) { return (registry[key]||[]).map(p => ({...p, re:new RegExp(p.pattern,'i')})); }
export function publicRoutes() { return (readJson('data/routes/route_manifest.json',{routes:[]}).routes||[]).filter(r=>r.index!==false && r.type!=='admin'); }

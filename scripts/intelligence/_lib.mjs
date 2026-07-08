#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export const root = process.cwd();
export const now = () => new Date().toISOString();
export function readJson(file, fallback=null){ const p=path.join(root,file); if(!fs.existsSync(p)) return fallback; return JSON.parse(fs.readFileSync(p,"utf8")); }
export function writeJson(file, data){ const p=path.join(root,file); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(data,null,2)+"\n"); }
export function appendRun(connectorId,status,details={}){ const file="data/intelligence/ingestion_runs.json"; const data=readJson(file,{schemaVersion:"4.1.0",runs:[]}); data.runs.unshift({id:crypto.randomUUID(),connectorId,status,ranAt:now(),...details}); data.runs=data.runs.slice(0,250); writeJson(file,data); return data.runs[0]; }
export function env(name){ return process.env[name] && process.env[name].trim() ? process.env[name].trim() : ""; }
export function statusOnly(connectorId,status,reason){ appendRun(connectorId,status,{reason,recordsImported:0}); console.log(JSON.stringify({connectorId,status,reason,recordsImported:0},null,2)); }
export async function fetchJson(url, options={}){ const res=await fetch(url,options); const text=await res.text(); let json=null; try{json=text?JSON.parse(text):null}catch{}; if(!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,300)}`); return json ?? {raw:text}; }
export function normalizeRoute(s){ if(!s) return "/"; let v=String(s).trim(); if(v.startsWith("https://")){ try{ v=new URL(v).pathname; }catch{} } if(!v.startsWith("/")) v="/"+v; return v.replace(/\/$/,"") || "/"; }
export function safeScore(n){ return Number.isFinite(Number(n)) ? Number(n) : 0; }
export function utilityScore(query){ const q=String(query||"").toLowerCase(); let score=20; if(/letter|checklist|template|example|steps|document|guide|what to attach|where to send/.test(q)) score+=35; if(/apartment|rent|employment|income|credit|dispute|explanation/.test(q)) score+=25; if(/fake|guarantee|delete accurate|repair your credit/.test(q)) score-=60; return Math.max(0,Math.min(100,score)); }
export function riskFor(query){ const q=String(query||"").toLowerCase(); if(/fake|forged|guarantee|delete accurate|repair your credit|increase score/.test(q)) return "high"; if(/credit|dispute|eviction|income|employment/.test(q)) return "regulated"; return "low"; }
export function actionDecision({query, hasRoute=false, searchScore=0, citationScore=0}){ const u=utilityScore(query); const risk=riskFor(query); if(risk==="high") return {admissionStatus:"blocked_compliance_risk",recommendedAction:"build_safe_boundary_or_do_not_build_generator",userUtilityScore:u,reason:"Unsafe or misleading request pattern."};
 if(hasRoute && u>=50) return {admissionStatus: searchScore>=45 ? "indexable_growth_page" : "indexable_utility_page", recommendedAction:"improve_existing_page", userUtilityScore:u, reason:"Existing route can satisfy intent with improvements."};
 if(u>=65) return {admissionStatus: searchScore>=45||citationScore>=45 ? "indexable_growth_page" : "indexable_utility_page", recommendedAction:"build_or_add_utility_content", userUtilityScore:u, reason:"Useful to onsite visitors even if search upside is limited."};
 if(u>=35) return {admissionStatus:"noindex_utility_page",recommendedAction:"add_faq_section_or_checklist",userUtilityScore:u,reason:"Low growth value but possible onsite support value."};
 return {admissionStatus:"blocked_duplicate_or_thin",recommendedAction:"merge_or_do_not_build",userUtilityScore:u,reason:"Not enough unique utility unless tied to a product flow."}; }
export function backlinkDecision({searchScore=0, internalLinkScore=0, competitorDelta=0, evidence=false}){ if(!evidence && searchScore>60) return "PAID_BACKLINK_DATA_NEEDED"; if(searchScore<35) return "NO_BACKLINK_NEEDED"; if(internalLinkScore<50) return "INTERNAL_LINKS_FIRST"; if(competitorDelta>50) return "DIGITAL_PR_RECOMMENDED"; return "SOURCE_AUTHORITY_FIRST"; }

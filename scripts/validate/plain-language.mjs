#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { root, walk, fail } from "./_common.mjs";
const boundary = "We do not fix your credit for you. We do not contact credit bureaus, landlords, lenders, employers, or creditors for you. We give you self-service tools, letters, checklists, and step-by-step instructions so you can prepare and send your own paperwork.";
const downloadFiles = walk("templates/downloads").filter((file) => file.endsWith(".md"));
if (!downloadFiles.length) fail("[plain-language] no download templates");
for (const file of downloadFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const section of ["What this is","When to use it","What to review before sending","What to attach","Where to send it","What to do next","What this does not do"]) if (!text.includes("## " + section)) fail("[plain-language] missing section " + section + " in " + path.relative(root, file));
  const long = text.split(/[.!?]\s+/).find((sentence) => sentence.split(/\s+/).length > 34);
  if (long) fail("[plain-language] long instruction sentence in " + path.relative(root, file));
}
const creditPrompt = fs.readFileSync(path.join(root, "prompts/system/credit_self_service_guardrails.md"), "utf8");
if (!creditPrompt.includes(boundary)) fail("[plain-language] missing exact credit boundary");
console.log("[plain-language] OK");

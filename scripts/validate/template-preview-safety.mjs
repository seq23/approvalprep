#!/usr/bin/env node
import { readJson, textOf } from '../lib/safe-harbor-utils.mjs';
const text=textOf(readJson('data/templates/template_registry.json',{}));
if (/r2\.cloudflare|seed-downloads|\.docx|\.pdf/.test(text) && !/protected|checkout|download-file/.test(text)) throw new Error('public template preview may expose paid asset');
console.log('[validate:template-preview-safety] OK');

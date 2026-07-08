#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
const atoms = readJson("data/atoms/answer_atoms.json").atoms;
const usage = readJson("data/atoms/atom_usage_map.json").usage;
const sourceMap = readJson("data/atoms/atom_source_map.json").mappings;
for (const atom of atoms) {
  if (!atom.atom_id || !atom.atom_type || !atom.source_basis || !atom.allowed_page_families?.length) fail("[atoms] incomplete atom " + atom.atom_id);
  if (!usage.find((u) => u.atom_id === atom.atom_id)) fail("[atoms] missing usage " + atom.atom_id);
  if (!sourceMap.find((m) => m.atom_id === atom.atom_id)) fail("[atoms] missing source map " + atom.atom_id);
}
console.log("[atoms] OK");

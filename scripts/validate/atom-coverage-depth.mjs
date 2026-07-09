#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const atoms = JSON.parse(fs.readFileSync("data/atoms/answer_atoms.json", "utf8"));
const targets = JSON.parse(fs.readFileSync("data/atoms/citation_targets.json", "utf8"));
const generatedCopy = JSON.parse(fs.readFileSync("data/content/generated_route_copy.json", "utf8"));
const ids = new Set();
for (const atom of atoms.atoms) {
  if (!atom.atom_id || !atom.atom_type || !atom.text || !atom.route_owner) fail("[atom-coverage-depth] incomplete atom");
  if (ids.has(atom.atom_id)) fail("[atom-coverage-depth] duplicate atom " + atom.atom_id);
  ids.add(atom.atom_id);
}
for (const route of Object.keys(generatedCopy.routes || {})) {
  const count = atoms.atoms.filter((atom) => atom.route_owner === route).length;
  if (count < 2) fail("[atom-coverage-depth] generated route lacks atom coverage " + route);
}
for (const target of targets.targets) {
  if (!target.query || !target.route || target.telemetry_required_for_win_claim !== true) fail("[atom-coverage-depth] citation target missing honesty boundary");
}
console.log(`[atom-coverage-depth] OK atoms=${atoms.atoms.length} targets=${targets.targets.length}`);

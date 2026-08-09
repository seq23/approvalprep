import fs from 'node:fs';
import path from 'node:path';

export function decisionFor(validator, exitCode) {
  if (exitCode === 0) return 'PASS';
  if (validator.severity === 'HARD_FAIL' || validator.blocksRelease === true) return 'BLOCK';
  return 'WARN';
}

export function validateRegistryDefinition(registry, pkg, root = process.cwd()) {
  const errors = [];
  if (!registry || registry.schemaVersion !== '2.0.0' || !Array.isArray(registry.validators)) errors.push('registry_schema_invalid');
  const ids = new Set();
  const scripts = new Set();
  for (const validator of registry?.validators || []) {
    if (!validator.id || !validator.npmScript || !validator.entrypoint || !validator.severity || !validator.blockReason) errors.push(`incomplete:${validator?.id || 'unknown'}`);
    if (ids.has(validator.id)) errors.push(`duplicate_id:${validator.id}`); else ids.add(validator.id);
    if (scripts.has(validator.npmScript)) errors.push(`duplicate_npm_script:${validator.npmScript}`); else scripts.add(validator.npmScript);
    if (!['HARD_FAIL','STRONG_WARNING'].includes(validator.severity)) errors.push(`invalid_severity:${validator.id}:${validator.severity}`);
    if (validator.severity === 'HARD_FAIL' && validator.blocksRelease !== true) errors.push(`hard_fail_must_block:${validator.id}`);
    if (validator.severity === 'STRONG_WARNING' && validator.blocksRelease !== false) errors.push(`strong_warning_must_not_block:${validator.id}`);
    if (!pkg?.scripts?.[validator.npmScript]) errors.push(`missing_npm_script:${validator.id}:${validator.npmScript}`);
    if (validator.entrypoint && !/\s/.test(validator.entrypoint) && !fs.existsSync(path.join(root, validator.entrypoint))) errors.push(`missing_entrypoint:${validator.id}:${validator.entrypoint}`);
  }
  return errors;
}

export function simulateSequence(validators, exitCodes) {
  const events = [];
  for (let i = 0; i < validators.length; i += 1) {
    const validator = validators[i];
    const code = Number(exitCodes[i] || 0);
    const decision = decisionFor(validator, code);
    events.push({ id: validator.id, exitCode: code, decision });
    if (decision === 'BLOCK') return { blocked: true, events };
  }
  return { blocked: false, events };
}

#!/usr/bin/env node
import fs from 'node:fs';
const canonical = JSON.parse(fs.readFileSync('_repo_validation_registry.json','utf8'));
const generated = { ...canonical, generatedFrom:'_repo_validation_registry.json', generatedPolicy:'Do not edit this mirror manually; regenerate from the root canonical registry.' };
fs.mkdirSync('data/validation',{recursive:true});
fs.writeFileSync('data/validation/validator_registry.json',JSON.stringify(generated,null,2)+'\n');
console.log(`[validation-registry-sync] OK validators=${canonical.validators.length}`);

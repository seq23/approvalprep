#!/usr/bin/env node
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync('data/admin/content_manifest.json','utf8'));
const repo = process.env.GITHUB_REPOSITORY || 'OWNER/approvalprep';
const branch = process.env.GITHUB_REF_NAME || 'main';
const sourceFile = 'data/admin/content_manifest.json';
const edit = `https://github.com/${repo}/edit/${branch}/${sourceFile}`;
const hist = `https://github.com/${repo}/commits/${branch}/${sourceFile}`;
const items = manifest.items.map(item => ({...item, sourceFile, githubEditUrl:edit, githubHistoryUrl:hist, manifestEditUrl:edit, publishDateField:'scheduledAt', availableActions:['open_github_edit','open_history','change_publish_date','copy_approval_instructions']}));
fs.writeFileSync('data/admin/content_queue_index.json', JSON.stringify({schemaVersion:'4.2.0', repo, branch, items},null,2)+'\n');
fs.writeFileSync('data/admin/admin_action_registry.json', JSON.stringify({schemaVersion:'4.2.0', actions:['open_github_edit','open_history','change_publish_date','copy_approval_instructions'], realBackendWriteback:false, items:items.map(i=>({id:i.id,title:i.title,editUrl:i.githubEditUrl,historyUrl:i.githubHistoryUrl}))},null,2)+'\n');
console.log(JSON.stringify({status:'OK', items:items.length},null,2));

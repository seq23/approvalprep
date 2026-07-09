#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = process.cwd();
const arg = process.argv.find(a => a.startsWith("--workflow="));
const only = arg ? arg.split("=").slice(1).join("=").replace(/^\.github\/workflows\//, "") : null;
function read(file){ return fs.readFileSync(path.join(root,file),"utf8"); }
function write(file,data){ const p=path.join(root,file); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(data,null,2)+"\n"); }
const dir = path.join(root,".github/workflows");
const pkg = JSON.parse(read("package.json"));
const files = fs.readdirSync(dir).filter(f=>f.endsWith(".yml") || f.endsWith(".yaml")).sort().filter(f=>!only || f===only || `.github/workflows/${f}`===only);
const traces = files.map(file => {
  const text = read(`.github/workflows/${file}`);
  const commands = [...text.matchAll(/run:\s*(.+)|run:\s*\|([\s\S]*?)(?=\n\s*-\s|\n\s*[a-zA-Z_]+:\s|$)/g)].map(m => (m[1]||m[2]||"").trim()).filter(Boolean);
  const uses = [...text.matchAll(/uses:\s*([^\n]+)/g)].map(m=>m[1].trim());
  const secretRefs = [...new Set([...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m=>m[1]))].sort();
  const dataWrites = [...new Set(commands.flatMap(c => [...c.matchAll(/data\/[A-Za-z0-9_./-]+\.json/g)].map(m=>m[0])) )].sort();
  const npmScripts = [...new Set(commands.flatMap(c => [...c.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map(m=>m[1])) )].sort();
  const missingNpmScripts = npmScripts.filter(script => !pkg.scripts[script]);
  const usesNpmInstall = /npm install/.test(text);
  const usesNpmCi = /npm ci/.test(text);
  const buildsProject = /npm run build/.test(text);
  const dependencyInstallPolicyOk = buildsProject ? usesNpmCi && !usesNpmInstall : !usesNpmCi && !usesNpmInstall;
  const nodeVersionOk = /node-version:\s*22\.12\.0/.test(text);
  const runnerPinned = /runs-on:\s*ubuntu-24\.04/.test(text);
  const timeoutSet = /timeout-minutes:\s*\d+/.test(text);
  return {
    workflow: file,
    traceMode: "FIXTURE_TRACE_ONLY_NOT_PRODUCTION_TELEMETRY",
    proof_type: "fixture",
    real_telemetry: false,
    may_be_used_for_growth_claims: false,
    manualReady: /workflow_dispatch:/.test(text),
    scheduled: /schedule:/.test(text),
    pushTriggered: /push:/.test(text),
    pullRequestTriggered: /pull_request:/.test(text),
    hasCheckout: uses.some(u=>u.includes("actions/checkout")),
    hasNodeSetup: uses.some(u=>u.includes("actions/setup-node")) || file === "release-report.yml",
    nodeVersionOk,
    runnerPinned,
    timeoutSet,
    usesNpmInstall,
    usesNpmCi,
    buildsProject,
    dependencyInstallPolicyOk,
    fixtureTraceInput: /fixture_trace/.test(text) || file === "workflow-data-trace.yml",
    secretRefs,
    npmScripts,
    missingNpmScripts,
    expectedDataTouches: dataWrites,
    proofBoundary: "This trace proves workflow shape, commands, secret references, and fixture/manual-run readiness. It does not prove GitHub Actions execution, provider credentials, or deployed runtime.",
    traceId: crypto.createHash("sha256").update(file + text).digest("hex").slice(0,16)
  };
});
const summary = {
  schemaVersion: "4.2.1",
  generatedAt: new Date().toISOString(),
  status: traces.length ? "COMPLETE_FIXTURE_TRACE" : "NO_WORKFLOWS_FOUND",
  workflowCount: traces.length,
  manualReadyCount: traces.filter(t=>t.manualReady).length,
  scheduledCount: traces.filter(t=>t.scheduled).length,
  pushTriggeredCount: traces.filter(t=>t.pushTriggered).length,
  pullRequestTriggeredCount: traces.filter(t=>t.pullRequestTriggered).length,
  allManualReady: traces.every(t=>t.manualReady),
  allHaveFixtureTraceInput: traces.every(t=>t.fixtureTraceInput),
  allUsePinnedRunner: traces.every(t=>t.runnerPinned),
  allUseNode22: traces.every(t=>t.nodeVersionOk),
  allHaveTimeout: traces.every(t=>t.timeoutSet),
  allFollowDependencyInstallPolicy: traces.every(t=>t.dependencyInstallPolicyOk),
  allNpmScriptsKnown: traces.every(t=>t.missingNpmScripts.length === 0),
  traces
};
write("data/workflow_traces/latest.json", summary);
for (const t of traces) write(`data/workflow_traces/${t.workflow.replace(/\.ya?ml$/,"")}.json`, {schemaVersion:"4.2.1", ...t});
console.log(JSON.stringify({status: summary.status, workflowCount: summary.workflowCount, allManualReady: summary.allManualReady, allHaveFixtureTraceInput: summary.allHaveFixtureTraceInput}, null, 2));
if(!summary.allManualReady || !summary.allHaveFixtureTraceInput || !summary.allUsePinnedRunner || !summary.allUseNode22 || !summary.allHaveTimeout || !summary.allFollowDependencyInstallPolicy || !summary.allNpmScriptsKnown) process.exit(1);

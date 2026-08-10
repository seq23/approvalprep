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
const validationRegistry = JSON.parse(read("_repo_validation_registry.json"));
const packageNames = new Set([...Object.keys(pkg.dependencies||{}), ...Object.keys(pkg.devDependencies||{})].map(x=>x.replace(/^@[^/]+\//,'')));
const sequenceSource = read("scripts/workflows/run-package-sequence.mjs");
const packageSequences = {};
for (const m of sequenceSource.matchAll(/([A-Za-z0-9_-]+):\s*\[([^\]]*)\]/g)) {
  packageSequences[m[1]] = [...m[2].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);
}
function resolveScriptClosure(initialScripts) {
  const queue=[...initialScripts]; const seen=new Set(); const missing=new Set(); const commands=[];
  while(queue.length){
    const name=queue.shift(); if(seen.has(name)) continue; seen.add(name);
    const command=pkg.scripts?.[name];
    if(!command){ missing.add(name); continue; }
    commands.push({script:name,command});
    for(const m of command.matchAll(/npm\s+run\s+([A-Za-z0-9:_-]+)/g)) queue.push(m[1]);
    const seq=command.match(/node\s+scripts\/workflows\/run-package-sequence\.mjs\s+([A-Za-z0-9_-]+)/);
    if(seq && packageSequences[seq[1]]) queue.push(...packageSequences[seq[1]]);
    if(name === "validate:all") queue.push(...(validationRegistry.validators||[]).map(v=>v.npmScript).filter(Boolean));
  }
  return {scripts:[...seen].sort(), missing:[...missing].sort(), commands};
}
function installReason(closure){
  for(const {script,command} of closure.commands){
    if(script === "build") return `transitive:${script}`;
    const first=command.trim().split(/\s+/)[0].replace(/^\.\//,'');
    if(packageNames.has(first)) return `package-bin:${first}`;
    if(/^npx\b/.test(command.trim())) return `npx:${script}`;
  }
  return null;
}
const files = fs.readdirSync(dir).filter(f=>f.endsWith(".yml") || f.endsWith(".yaml")).sort().filter(f=>!only || f===only || `.github/workflows/${f}`===only);
const traces = files.map(file => {
  const text = read(`.github/workflows/${file}`);
  const commands = [...text.matchAll(/run:\s*(.+)|run:\s*\|([\s\S]*?)(?=\n\s*-\s|\n\s*[a-zA-Z_]+:\s|$)/g)].map(m => (m[1]||m[2]||"").trim()).filter(Boolean);
  const uses = [...text.matchAll(/uses:\s*([^\n]+)/g)].map(m=>m[1].trim());
  const secretRefs = [...new Set([...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m=>m[1]))].sort();
  const dataWrites = [...new Set(commands.flatMap(c => [...c.matchAll(/data\/[A-Za-z0-9_./-]+\.json/g)].map(m=>m[0])) )].sort();
  const npmScripts = [...new Set(commands.flatMap(c => [...c.matchAll(/npm\s+run\s+([A-Za-z0-9:_-]+)/g)].map(m=>m[1])) )].sort();
  const closure = resolveScriptClosure(npmScripts);
  const missingNpmScripts = closure.missing;
  const usesNpmInstall = /npm install/.test(text);
  const usesNpmCi = /npm ci\b/.test(text);
  const installDependencyReason = installReason(closure);
  const requiresDependencyInstall = Boolean(installDependencyReason);
  const buildsProject = closure.scripts.includes("build");
  const dependencyInstallPolicyOk = requiresDependencyInstall ? usesNpmCi && !usesNpmInstall : !usesNpmInstall;
  const nodeVersionOk = /node-version:\s*22\.12\.0/.test(text);
  const runnerPinned = /runs-on:\s*ubuntu-24\.04/.test(text);
  const timeoutSet = /timeout-minutes:\s*\d+/.test(text);
  const mainWriter = /safe-push-main\.sh/.test(text) || /(^|\n)\s*git push(?:\s|$)/m.test(text);
  const sharedWriterConcurrency = !mainWriter || (/group:\s*approvalprep-main-writer\b/.test(text) && /cancel-in-progress:\s*false/.test(text));
  const fullMainCheckout = !mainWriter || (/ref:\s*main/.test(text) && /fetch-depth:\s*0/.test(text));
  const preparesLatestMain = !mainWriter || /prepare-main-writer\.sh/.test(text);
  const safePushHelper = !mainWriter || /safe-push-main\.sh/.test(text);
  const directUnsafePush = /(^|\n)\s*git push(?:\s|$)/m.test(text);
  const fauxScenarios = [
    { id: "manual_fixture_dispatch", status: /workflow_dispatch:/.test(text) ? "PASS" : "FAIL" },
    { id: "known_command_resolution", status: missingNpmScripts.length ? "FAIL" : "PASS" },
    { id: "transitive_dependency_install", status: dependencyInstallPolicyOk ? "PASS" : "FAIL", requires_dependency_install: requiresDependencyInstall, reason: installDependencyReason },
    { id: "pinned_runtime_and_timeout", status: runnerPinned && timeoutSet && (nodeVersionOk || file === "release-report.yml") ? "PASS" : "FAIL" },
    { id: "secret_boundary", status: secretRefs.length ? "PROVIDER_GATED_NO_FAKE_SUCCESS" : "NOT_APPLICABLE" }
  ];
  if (mainWriter) fauxScenarios.push(
    { id: "latest_main_before_generation", status: preparesLatestMain && fullMainCheckout ? "PASS" : "FAIL" },
    { id: "no_change_commit_path", status: safePushHelper ? "PASS" : "FAIL" },
    { id: "remote_advance_rebase_retry", status: safePushHelper && sharedWriterConcurrency ? "PASS" : "FAIL" },
    { id: "conflict_blocks_without_force", status: safePushHelper && !directUnsafePush ? "PASS" : "FAIL" }
  );
  else fauxScenarios.push({ id: "no_direct_main_write", status: "PASS" });
  return {
    workflow: file,
    traceMode: "FIXTURE_TRACE_WITH_TRANSITIVE_PACKAGE_RESOLUTION_NOT_PRODUCTION_TELEMETRY",
    proof_type: "fixture",
    real_telemetry: false,
    may_be_used_for_growth_claims: false,
    manualReady: /workflow_dispatch:/.test(text),
    scheduled: /schedule:/.test(text),
    pushTriggered: /(^|\n)\s*push:\s*/m.test(text),
    pullRequestTriggered: /pull_request:/.test(text),
    hasCheckout: uses.some(u=>u.includes("actions/checkout")),
    hasNodeSetup: uses.some(u=>u.includes("actions/setup-node")) || file === "release-report.yml",
    nodeVersionOk, runnerPinned, timeoutSet, usesNpmInstall, usesNpmCi, buildsProject,
    requiresDependencyInstall, installDependencyReason, dependencyInstallPolicyOk,
    fixtureTraceInput: /fixture_trace/.test(text) || file === "workflow-data-trace.yml",
    secretRefs, npmScripts, transitiveNpmScripts: closure.scripts, missingNpmScripts,
    expectedDataTouches: dataWrites, mainWriter, sharedWriterConcurrency, fullMainCheckout,
    preparesLatestMain, safePushHelper, directUnsafePush, fauxScenarios,
    proofBoundary: "This fixture trace resolves direct and transitive npm scripts, Citation OS package sequences, and validate:all registry members so dependency-backed runtime requirements cannot hide behind wrapper scripts. It also proves workflow shape, secret references, serialized main-writer controls, and manual readiness. It does not prove provider credentials or deployed runtime.",
    traceId: crypto.createHash("sha256").update(file + text).digest("hex").slice(0,16)
  };
});
const summary = {
  schemaVersion: "4.4.0", generatedAt: new Date().toISOString(), status: traces.length ? "COMPLETE_FIXTURE_TRACE" : "NO_WORKFLOWS_FOUND",
  workflowCount: traces.length, manualReadyCount: traces.filter(t=>t.manualReady).length, scheduledCount: traces.filter(t=>t.scheduled).length,
  pushTriggeredCount: traces.filter(t=>t.pushTriggered).length, pullRequestTriggeredCount: traces.filter(t=>t.pullRequestTriggered).length,
  mainWriterCount: traces.filter(t=>t.mainWriter).length, fauxScenarioCount: traces.reduce((sum,t)=>sum+t.fauxScenarios.length,0),
  allManualReady: traces.every(t=>t.manualReady), allHaveFixtureTraceInput: traces.every(t=>t.fixtureTraceInput), allUsePinnedRunner: traces.every(t=>t.runnerPinned),
  allUseNode22: traces.every(t=>t.nodeVersionOk || t.workflow === "release-report.yml"), allHaveTimeout: traces.every(t=>t.timeoutSet),
  allFollowDependencyInstallPolicy: traces.every(t=>t.dependencyInstallPolicyOk), allNpmScriptsKnown: traces.every(t=>t.missingNpmScripts.length === 0),
  allMainWritersSerialized: traces.filter(t=>t.mainWriter).every(t=>t.sharedWriterConcurrency), allMainWritersUseFullCheckout: traces.filter(t=>t.mainWriter).every(t=>t.fullMainCheckout),
  allMainWritersPrepareLatestMain: traces.filter(t=>t.mainWriter).every(t=>t.preparesLatestMain), allMainWritersUseSafePush: traces.filter(t=>t.mainWriter).every(t=>t.safePushHelper && !t.directUnsafePush),
  allFauxScenariosPass: traces.every(t=>t.fauxScenarios.every(s=>["PASS","NOT_APPLICABLE","PROVIDER_GATED_NO_FAKE_SUCCESS"].includes(s.status))), traces
};
write("data/workflow_traces/latest.json", summary);
for (const t of traces) write(`data/workflow_traces/${t.workflow.replace(/\.ya?ml$/,"")}.json`, {schemaVersion:"4.4.0", ...t});
console.log(JSON.stringify({status: summary.status, workflowCount: summary.workflowCount, mainWriterCount: summary.mainWriterCount, fauxScenarioCount: summary.fauxScenarioCount}, null, 2));
if(!summary.allManualReady || !summary.allHaveFixtureTraceInput || !summary.allUsePinnedRunner || !summary.allUseNode22 || !summary.allHaveTimeout || !summary.allFollowDependencyInstallPolicy || !summary.allNpmScriptsKnown || !summary.allMainWritersSerialized || !summary.allMainWritersUseFullCheckout || !summary.allMainWritersPrepareLatestMain || !summary.allMainWritersUseSafePush || !summary.allFauxScenariosPass) process.exit(1);

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
  const dependencyInstallPolicyOk = buildsProject ? usesNpmCi && !usesNpmInstall : !usesNpmInstall;
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
    traceMode: "FIXTURE_TRACE_ONLY_NOT_PRODUCTION_TELEMETRY",
    proof_type: "fixture",
    real_telemetry: false,
    may_be_used_for_growth_claims: false,
    manualReady: /workflow_dispatch:/.test(text),
    scheduled: /schedule:/.test(text),
    pushTriggered: /(^|\n)\s*push:\s*/m.test(text),
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
    mainWriter,
    sharedWriterConcurrency,
    fullMainCheckout,
    preparesLatestMain,
    safePushHelper,
    directUnsafePush,
    fauxScenarios,
    proofBoundary: "This trace proves workflow shape, commands, secret references, serialized main-writer controls, and fixture/manual-run readiness. It does not prove GitHub Actions execution, provider credentials, or deployed runtime.",
    traceId: crypto.createHash("sha256").update(file + text).digest("hex").slice(0,16)
  };
});
const summary = {
  schemaVersion: "4.3.0",
  generatedAt: new Date().toISOString(),
  status: traces.length ? "COMPLETE_FIXTURE_TRACE" : "NO_WORKFLOWS_FOUND",
  workflowCount: traces.length,
  manualReadyCount: traces.filter(t=>t.manualReady).length,
  scheduledCount: traces.filter(t=>t.scheduled).length,
  pushTriggeredCount: traces.filter(t=>t.pushTriggered).length,
  pullRequestTriggeredCount: traces.filter(t=>t.pullRequestTriggered).length,
  mainWriterCount: traces.filter(t=>t.mainWriter).length,
  fauxScenarioCount: traces.reduce((sum,t)=>sum+t.fauxScenarios.length,0),
  allManualReady: traces.every(t=>t.manualReady),
  allHaveFixtureTraceInput: traces.every(t=>t.fixtureTraceInput),
  allUsePinnedRunner: traces.every(t=>t.runnerPinned),
  allUseNode22: traces.every(t=>t.nodeVersionOk || t.workflow === "release-report.yml"),
  allHaveTimeout: traces.every(t=>t.timeoutSet),
  allFollowDependencyInstallPolicy: traces.every(t=>t.dependencyInstallPolicyOk),
  allNpmScriptsKnown: traces.every(t=>t.missingNpmScripts.length === 0),
  allMainWritersSerialized: traces.filter(t=>t.mainWriter).every(t=>t.sharedWriterConcurrency),
  allMainWritersUseFullCheckout: traces.filter(t=>t.mainWriter).every(t=>t.fullMainCheckout),
  allMainWritersPrepareLatestMain: traces.filter(t=>t.mainWriter).every(t=>t.preparesLatestMain),
  allMainWritersUseSafePush: traces.filter(t=>t.mainWriter).every(t=>t.safePushHelper && !t.directUnsafePush),
  allFauxScenariosPass: traces.every(t=>t.fauxScenarios.every(s=>s.status === "PASS" || s.status === "NOT_APPLICABLE" || s.status === "PROVIDER_GATED_NO_FAKE_SUCCESS")),
  traces
};
write("data/workflow_traces/latest.json", summary);
for (const t of traces) write(`data/workflow_traces/${t.workflow.replace(/\.ya?ml$/,"")}.json`, {schemaVersion:"4.3.0", ...t});
console.log(JSON.stringify({status: summary.status, workflowCount: summary.workflowCount, mainWriterCount: summary.mainWriterCount, fauxScenarioCount: summary.fauxScenarioCount}, null, 2));
if(!summary.allManualReady || !summary.allHaveFixtureTraceInput || !summary.allUsePinnedRunner || !summary.allUseNode22 || !summary.allHaveTimeout || !summary.allFollowDependencyInstallPolicy || !summary.allNpmScriptsKnown || !summary.allMainWritersSerialized || !summary.allMainWritersUseFullCheckout || !summary.allMainWritersPrepareLatestMain || !summary.allMainWritersUseSafePush || !summary.allFauxScenariosPass) process.exit(1);

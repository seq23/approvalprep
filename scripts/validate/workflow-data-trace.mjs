#!/usr/bin/env node
import {readJson,fail,exists} from "./_common.mjs";
const trace = readJson("data/workflow_traces/latest.json");
if (trace.status !== "COMPLETE_FIXTURE_TRACE") fail("[workflow-data-trace] latest trace not complete");
if (!trace.workflowCount || trace.workflowCount < 1) fail("[workflow-data-trace] no workflows traced");
if (!trace.allManualReady) fail("[workflow-data-trace] not all workflows have workflow_dispatch/manual readiness");
if (!trace.allHaveFixtureTraceInput) fail("[workflow-data-trace] not all workflows expose fixture_trace/manual fixture lane");
if (!trace.allUsePinnedRunner) fail("[workflow-data-trace] every workflow must use explicit ubuntu-24.04 runner");
if (!trace.allUseNode22) fail("[workflow-data-trace] every workflow must use Node 22.12.0");
if (!trace.allHaveTimeout) fail("[workflow-data-trace] every workflow job must set timeout-minutes");
if (!trace.allFollowDependencyInstallPolicy) fail("[workflow-data-trace] dependency install policy mismatch: only build workflow should use npm ci; stdlib workflows should not install dependencies");
if (!trace.allNpmScriptsKnown) fail("[workflow-data-trace] workflow references unknown npm script");
for (const t of trace.traces) {
  if (!t.workflow || !Array.isArray(t.npmScripts)) fail("[workflow-data-trace] malformed trace row");
  if (t.proof_type !== "fixture") fail(`[workflow-data-trace] missing fixture proof_type in ${t.workflow}`);
  if (t.real_telemetry !== false) fail(`[workflow-data-trace] trace must mark real_telemetry false in ${t.workflow}`);
  if (t.may_be_used_for_growth_claims !== false) fail(`[workflow-data-trace] trace must not be usable for growth claims in ${t.workflow}`);
  if (!t.runnerPinned) fail(`[workflow-data-trace] unpinned runner in ${t.workflow}`);
  if (!t.nodeVersionOk) fail(`[workflow-data-trace] Node 22.12.0 missing in ${t.workflow}`);
  if (!t.timeoutSet) fail(`[workflow-data-trace] timeout-minutes missing in ${t.workflow}`);
  if (!t.dependencyInstallPolicyOk) fail(`[workflow-data-trace] dependency install policy violation in ${t.workflow}`);
  if (t.missingNpmScripts?.length) fail(`[workflow-data-trace] unknown npm scripts in ${t.workflow}: ${t.missingNpmScripts.join(", ")}`);
  if (!exists(`data/workflow_traces/${t.workflow.replace(/\.ya?ml$/, "")}.json`)) fail(`[workflow-data-trace] missing per-workflow trace for ${t.workflow}`);
  if (String(t.proofBoundary||"").toLowerCase().includes("production verified")) fail(`[workflow-data-trace] fake production proof in ${t.workflow}`);
}
console.log(`[workflow-data-trace] OK ${trace.workflowCount} workflows traced`);

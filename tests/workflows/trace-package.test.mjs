import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('workflow commands resolve in their package and unknown scripts still fail', () => {
  const dir = mkdtempSync(join(tmpdir(), 'app-workflow-'));
  const put = (file, value) => { mkdirSync(join(dir, file, '..'), { recursive: true }); writeFileSync(join(dir, file), value); };
  try {
    put('package.json', JSON.stringify({ scripts: {} }));
    put('_repo_validation_registry.json', JSON.stringify({ validators: [] }));
    put('scripts/workflows/run-package-sequence.mjs', '');
    put('apps/mobile/package.json', JSON.stringify({ scripts: { check: 'npm run typecheck', typecheck: 'tsc --noEmit' }, devDependencies: { typescript: '*' } }));
    const workflow = script => `on:\n  workflow_dispatch:\n    inputs:\n      fixture_trace: {}\njobs:\n  preview:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 5\n    defaults:\n      run:\n        working-directory: apps/mobile\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22.12.0\n      - run: npm ci\n      - run: npm run ${script}\n`;
    const run = () => spawnSync(process.execPath, [resolve('scripts/workflows/trace-all.mjs')], { cwd: dir });
    put('.github/workflows/preview.yml', workflow('check'));
    assert.equal(run().status, 0);
    const trace = JSON.parse(readFileSync(join(dir, 'data/workflow_traces/latest.json'))).traces[0];
    assert.deepEqual(trace.transitiveNpmScripts, ['check', 'typecheck']);
    put('.github/workflows/preview.yml', workflow('missing'));
    assert.equal(run().status, 1);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'data/workflow_traces/latest.json'))).traces[0].missingNpmScripts, ['missing']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

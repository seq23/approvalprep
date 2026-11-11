import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
test('letters never promise a payment-for-removal arrangement', () => {
  let files = 0;
  function scan(dir: string) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.tsx?$/.test(entry.name)) { files++; assert.doesNotMatch(readFileSync(path, 'utf8'), /pay[\s_-]*for[\s_-]*delete/i, path); }
  } }
  scan('src'); scan('app'); assert.ok(files > 0);
});

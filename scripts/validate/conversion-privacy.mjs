#!/usr/bin/env node
// The conversion endpoint refuses customer document text and identity fields.
// (Before 1 Nov 2026 this read functions/api/track-event.ts, which does not exist, so it
// passed without reading anything.) Behaviour, not wording: the blocklist must still name every sensitive field and the
// handler must still reject a body that carries one.
import fs from 'node:fs';
const f = 'functions/api/track-event.js';
if (!fs.existsSync(f)) throw new Error(`[conversion-privacy] ${f} missing: the conversion endpoint this guards has moved`);
const s = fs.readFileSync(f, 'utf8');
const list = s.match(/const blockedKeys\s*=\s*\[([^\]]*)\]/);
if (!list) throw new Error('[conversion-privacy] track-event.js has no blockedKeys list');
const blocked = [...list[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
const must = ['letterText', 'documentText', 'email', 'phone', 'address', 'ssn', 'dob', 'fullIp', 'freeText'];
const missing = must.filter((k) => !blocked.includes(k));
if (missing.length) throw new Error(`[conversion-privacy] blockedKeys no longer refuses: ${missing.join(', ')}`);
if (!/for \(const key of blockedKeys\) if \(Object\.prototype\.hasOwnProperty\.call\(body, key\)\) throw/.test(s)) throw new Error('[conversion-privacy] the handler no longer rejects a body carrying a blocked key');
console.log(`[validate:conversion-privacy] OK blocked=${blocked.length}`);

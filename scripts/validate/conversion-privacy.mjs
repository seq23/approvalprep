#!/usr/bin/env node
import fs from 'node:fs';
const f='functions/api/track-event.ts'; if (fs.existsSync(f)) { const s=fs.readFileSync(f,'utf8'); if (/letterAnswer|documentText|fullIp|password/i.test(s)) throw new Error('conversion endpoint may store sensitive data'); }
console.log('[validate:conversion-privacy] OK');

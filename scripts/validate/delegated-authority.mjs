#!/usr/bin/env node
import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('data/governance/delegated_authority_contract.json','utf8'));
const requiredArrays = ['autoApprovedActions','selfHealAllowed','ownerExceptions','absoluteForbidden','statuses'];
for (const key of requiredArrays) if (!Array.isArray(c[key]) || c[key].length === 0) { console.error(`[delegated-authority] missing ${key}`); process.exit(1); }
for (const item of ['create_fake_paystub','claim_credit_repair_service','expose_secret','publish_fixture_data_as_real']) if (!c.absoluteForbidden.includes(item)) { console.error(`[delegated-authority] forbidden missing ${item}`); process.exit(1); }
for (const status of ['approved_by_contract','self_healed_by_contract','owner_exception','final_blocked_after_self_heal']) if (!c.statuses.includes(status)) { console.error(`[delegated-authority] status missing ${status}`); process.exit(1); }
if (c.citationAuthority?.guaranteed !== false || c.citationAuthority?.winsRequireTelemetry !== true) { console.error('[delegated-authority] citation wins boundary invalid'); process.exit(1); }
console.log('[delegated-authority] OK');

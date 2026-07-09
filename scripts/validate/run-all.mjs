#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const scripts = ["validate:repo","validate:validation-registry","validate:validator-severity","validate:prohibited-claims","validate:required-disclosures","validate:source-required-claims","validate:template-preview-safety","validate:safe-harbor-autopublish","validate:source-evidence-depth","validate:regulated-template-previews","validate:location-source-coverage","validate:workflow-write-scopes","validate:self-healing","validate:conversion-privacy","validate:experiment-safety","validate:page-action-safety","validate:final-readiness-ledger","validate:routes","validate:legal","validate:plain-language","validate:download-safety","validate:download-first-page-boundary","validate:download-offering-coverage","validate:data-privacy","validate:prompt-guardrails","validate:atoms","validate:citation-claims","validate:telemetry-claims","validate:atlas","validate:seo-surfaces","validate:admin","validate:payment-download","env:audit","validate:env-examples","validate:vault-schema","validate:security","validate:intelligence-connectors","validate:no-fake-intelligence","validate:intelligence-freshness","validate:competitor-crawl","validate:serp-import","validate:backlink-honesty","validate:content-actions","validate:content-release","validate:maintenance-briefs","validate:citation-opportunities","validate:workflow-trace","validate:setup-secrets","validate:admin-action-links","validate:citation-strategy","validate:growth-health","validate:automation-safety","validate:delegated-authority","validate:self-heal-progressions","validate:owner-exceptions","validate:notification-policy","ux:browserless-report","validate:ux-conversion","validate:public-page-depth","validate:cta-quality","validate:trust-signals","validate:browserless-accessibility","validate:mobile-ux","validate:plain-language-grade","validate:credit-boundary","validate:customer-next-steps","validate:e2e-user-journey","validate:product-flow-e2e","validate:product-model","validate:stripe-mode","validate:offering-visibility","validate:offering-contracts","validate:letter-studio","validate:navigation-architecture","validate:commercial-page-cta-depth","validate:page-factory","validate:blog-detail-pages","validate:atom-coverage-depth","validate:discovery-surfaces","validate:structured-data","validate:internal-link-graph","validate:authority-assets","validate:template-library","validate:metrics-scoreboards","validate:provider-integrations","validate:cloudflare-crawler-intelligence","validate:indexing-provider-ledgers","validate:citation-ledger","validate:backlink-handoff","validate:content-lifecycle","validate:content-approval-governance","validate:public-reports","validate:repurposing","validate:conversion-attribution","validate:artifact"];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of scripts) {
  const command = pkg.scripts?.[script];
  if (!command) {
    console.error(`[validate:all] missing package script ${script}`);
    process.exit(1);
  }
  const parts = command.trim().split(/\s+/);
  const result = spawnSync(parts[0], parts.slice(1), { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('[validate:all] OK');

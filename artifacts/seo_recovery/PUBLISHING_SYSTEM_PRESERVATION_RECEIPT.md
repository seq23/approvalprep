# Publishing System Preservation Receipt

## Byte-for-byte restored from the original ZIP

- `.github/workflows/citation-os-daily.yml` — SHA-256 match: `d973672d6334054e1fddeeca0a26a971bcec656c7aaccd73247c65c2d510776c`
- `.github/workflows/scheduled-content-release.yml` — SHA-256 match: `10c07dc811de52850c957b70a97c9fe1ff60a014df3bf88c88562f255f98cffa`
- `data/release/release_ledger.json` — SHA-256 match: `2738694c047805db0deeea3f51da755e60eefd568852092a58b5707b0d2fd78d`
- `scripts/content/generate-atom-expansion.mjs` — SHA-256 match: `f9a68c5cbfa080c307c82f12169e697993350a439e4e4617fb0ced6fac719cfa`
- `scripts/content/generate-candidate.mjs` — SHA-256 match: `d396e033f2d0a6a50c5a4703c28c865a3bac677eadfa1d99f40913e65ce5560f`
- `scripts/governance/promote-approved-content.mjs` — SHA-256 match: `595af99772893ce39eaf212f6c502708883ef52e0de99008ffe58b8b28d7efbd`
- `scripts/metrics/build-content-velocity.mjs` — SHA-256 match: `a69b5ab17a1a35895f7df165479fe3b7043ea78808e079c9694c01e6c59dc799`
- `scripts/seo/generate-sitemap.mjs` — SHA-256 match: `d896aef934046a12d352c18195e25b02f4e2b60bdf793d98c2823bc56138066c`
- `scripts/validate/admin.mjs` — SHA-256 match: `de767825a04f1985fed1f0a81a278f8c3b2ab40e7114efbd6843cb54bbfd7469`
- `scripts/validate/content-release.mjs` — SHA-256 match: `e489cae9970aaa1af876e3dccda0dca46dc89992adda5f4feb7cc56660556dfc`
- `scripts/validate/seo-surfaces.mjs` — SHA-256 match: `8c9c27e9c3b5262f00e37d3c937a3ace02dd348f42f94fec369905145aa8a317`
- `src/pages/admin.astro` — SHA-256 match: `9c9a792c9029570e36d297c38b38225c815f733b2fde59fd5421b7bad1592289`
- `src/pages/answers/index.json.ts` — SHA-256 match: `e70a3059830975a219afed08a39b272d0a97c93bcf95fbd1d0049781f5966985`
- `src/pages/blog.astro` — SHA-256 match: `2aa15c350f20d61350f2b98d5431571f2e9047968853764db7555c7ee64b9b73`
- `src/pages/blog/[slug].astro` — SHA-256 match: `993fd87485fe8976922db0f9f891f8972a4059806cf1cade8db4baeeda609587`
- `src/pages/content-index.json.ts` — SHA-256 match: `67588f544a5b5c00f230f3e61a848cf98b7f1dc313942c660cae99dc83c350dd`
- `src/pages/feed.xml.ts` — SHA-256 match: `b252c6757514e05b92fdb6aeae8657ebf42753da958bf2aee7aab74b58b26a6b`
- `src/pages/llms-full.txt.ts` — SHA-256 match: `31aa42570a7978df79cef79d538b87398433dba9a431ef6ac141954db885cb4b`
- `docs/runbooks/GITHUB_ACTIONS_AND_CONTENT_AUTOPUBLISH_PROOF.md` — SHA-256 match: `5616298d5bb4f74cb7aa2574505e8dcf095a25b1ae9096f36bf48673c3df162d`

## Intentional narrow changes

- `data/content/generated_answers.json` — Preserve all 45 source records while marking only the 42 exact duplicate URLs as redirect-backed tombstones.
- `scripts/content/self-heal.mjs` — Keep the original duplicate/release checks and recognize validated redirect-backed tombstones.
- `scripts/validate/blog-detail-pages.mjs` — Keep the original route contract and prove 42 redirected records cannot escape as public pages.
- `scripts/validate/discovery-surfaces.mjs` — Keep original discovery surfaces and permit zero current detail pages while the generator remains active.
- `scripts/validate/structured-data.mjs` — Preserve the original blog schema check and add the approved dedicated guide/report schema checks.

## Rejected architecture absent

- No private editorial queue.
- No replacement editorial registry.
- No legacy answer archive replacing the live registry.
- No deletion of the public blog detail route.
- No change to the scheduled public publishing operating model.

## Fixture proof

The restored content-release validator generated three distinct low-risk public pages in a temporary fixture release, confirmed same-day idempotency, and restored the source files afterward.

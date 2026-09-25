# Query coverage: missing search questions (2026-09-25)

We checked 20 real-person search questions against the live sitemap (106 URLs), `data/demand/measured_demand.json`
and `data/content/page_opportunities.json`. 15 already have a page. The 5 below do not.

## Why these are listed here and not in the queue

This repo's page queue is `data/demand/measured_demand.json`. `data/content/page_opportunities.json` is built from
it, and the page factory refuses any row that has no demand record. The `owner_seed_policy` admits only two kinds of
record: one with measured volume, or an `owner_approved_seed` that carries `approved_by`/`approved_at`. A
research-only phrasing with no volume is neither.

To promote one of these questions, do either of the following:

- measure it, for example as a Bing Webmaster Tools Keyword Research seed, and add it with the measured figure;
- have the owner approve it as a seed.

All five sit next to the Apartment Application Kit and the rental letters that are already live.

| query | nearest existing page | source |
|---|---|---|
| apartment application denied, what to do | /how-to-get-approved-for-an-apartment/ (prevention, not the denial) | https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-if-my-rental-application-is-denied-because-of-a-tenant-screening-report-en-2105/ |
| how to rent an apartment with bad credit | /how-to-get-approved-for-an-apartment/ | https://www.experian.com/blogs/ask-experian/how-to-get-apartment-with-bad-credit/ |
| how to get an apartment after an eviction | /letter-of-explanation/eviction/ (the letter, not the question) | https://www.thecreditpeople.com/credit/get-apartment-bad-credit-prior-eviction |
| do you need to make 3 times the rent | none | https://www.leaserunner.com/blog/3-times-the-rent |
| cosigner vs guarantor for an apartment | none | https://www.experian.com/blogs/ask-experian/guarantor-vs-cosigner/ |

## Measurement, 2026-09-25

All five questions were measured through this repo's existing lanes. None passed the demand gate, so none was added
to `data/demand/measured_demand.json` or `data/content/page_opportunities.json`. The gate was not loosened and no owner
seed was written.

| query | measured search volume (keyword tool) | measured GSC impressions | result |
|---|---|---|---|
| apartment application denied, what to do | not measurable (named stop below) | **0** | below threshold |
| how to rent an apartment with bad credit | not measurable | **0** | below threshold |
| how to get an apartment after an eviction | not measurable | **0** | below threshold |
| do you need to make 3 times the rent | not measurable | **0** | below threshold |
| cosigner vs guarantor for an apartment | not measurable | **0** | below threshold |

- **GSC lane** (`scripts/intelligence/ingest-gsc.mjs`): the last live pull, `data/intelligence/gsc_search_analytics.json`
  fetched 2026-09-21T12:35:38Z for `sc-domain:approvalprep.com` (28-day window), holds 4 rows. The only rental row is
  "help getting approved for an apartment" (1 impression, position 92), which is not one of these five. Each of the
  five therefore measured 0 impressions.
- **Keyword-tool lane** (`scripts/intelligence/ingest-bing-webmaster.mjs`, or Semrush for the existing records):
  the earlier named stop is cleared. The key is in the credential vault as `bing-webmaster-api-key` and in this repo's
  GitHub secrets as `BING_WEBMASTER_API_KEY` (both set 2026-09-25), so `intelligence-ingest-free-sources.yml` now
  reads a live key. The measurement is in the next section.

## Bing keyword measurement, 2026-09-25

Each seed was measured through the Bing Webmaster API `GetKeywordStats` (market `us`/`en-US`, and again with no market
filter). The window is 25 weekly buckets, 2026-03-28..2026-09-19. The sum of weekly `Impressions` is the volume
figure. As a control, `webinar` and `facebook` returned non-zero weekly rows in the same call shape. Two seeds were
also measured in shorter form ("apartment application denied", "cosigner vs guarantor"). For "cosigner vs guarantor",
the Keyword Research panel in the web UI agreed: Bing "doesn't have enough data".

| query | Bing impressions, us (26 wk) | Bing impressions, all markets | owner_seed_policy (measured volume > 0) | queued |
|---|---|---|---|---|
| apartment application denied, what to do | **0** (short form also 0) | **0** | refused | no |
| how to rent an apartment with bad credit | **0** | **0** | refused | no |
| how to get an apartment after an eviction | **0** | **0** | refused | no |
| do you need to make 3 times the rent | **0** | **0** | refused | no |
| cosigner vs guarantor for an apartment | **0** (short form also 0) | **0** | refused | no |

None of the five clears the policy, so `data/demand/measured_demand.json` and `data/content/page_opportunities.json`
are unchanged. A 0 here means the phrasing is below Bing's reporting floor. It does not prove nobody searches for it.
The route that remains is the owner seed.

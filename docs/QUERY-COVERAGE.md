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

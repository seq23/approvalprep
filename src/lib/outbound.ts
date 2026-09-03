import ledger from "../../data/citations/outbound_link_health.json";

// internalHref() made every link this site emits to itself name the URL the
// server answers 200 for. Nothing did the equivalent for the links it emits to
// other people's sites, and those rot on someone else's schedule: HUD renamed
// form 52517.pdf and three property-management PDFs in the Document Readiness
// Index corpus were withdrawn, so 11 pages shipped a link to a 404 and a crawler
// reported all 11.
//
// data/citations/outbound_link_health.json is the measured status of every
// outbound link in the last build, written by scripts/seo/probe-outbound-links.mjs.
// This is the render-time half of the rule: a URL the probe proved is gone is
// still cited - the organisation and the access date are the research record and
// stay on the page - but it is not offered as a link a reader or a crawler can
// follow into a 404.
//
// Only `dead` suppresses. A source that 403s to automated clients is a live page
// behind a WAF; dropping dol.gov or ssa.gov because someone else's bot rules
// refuse us would make the page worse, not better.

type LedgerLink = { url: string; classification: string };

const deadUrls = new Set(
  ((ledger as { links?: LedgerLink[] }).links || [])
    .filter((l) => l.classification === "dead")
    .map((l) => l.url),
);

export const isDeadOutbound = (url: unknown): boolean => {
  const value = typeof url === "string" ? url : String(url ?? "");
  return deadUrls.has(value.replace(/&amp;/g, "&"));
};

export const outboundLinkCount = deadUrls.size;

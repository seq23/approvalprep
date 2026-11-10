// Host canonicalisation.
//
// www.approvalprep.com served the entire site at 200 next to the apex, and so
// did the two parked domains. The rules meant to prevent that lived in
// public/_redirects as absolute-URL sources - Netlify syntax. Cloudflare Pages
// matches _redirects by path only and never looked at the Host header, so those
// five rules had never fired since the day they were written. Verified before
// this change: `curl -I https://www.approvalprep.com/pricing/` returned 200 with
// a 60KB page.
//
// A duplicate host is not fatal on its own - the canonical tag points at the
// apex - but it doubles the crawlable surface of a site that is already losing
// indexed pages, and consolidation via canonical is a hint where a 301 is a
// directive.
//
// This runs as a root middleware, so it sees every request including static
// assets, and it must stay cheap: one hostname comparison, then next().

const CANONICAL_HOST = "approvalprep.com";

// Hosts that are legitimately not the canonical one and must be left alone:
// Pages preview deployments, the named preview subdomain, and local dev.
const isNonProductionHost = (hostname) =>
  hostname.endsWith(".pages.dev") ||
  hostname === "preview.approvalprep.com" ||
  hostname === "localhost" ||
  hostname === "127.0.0.1";

// Parked domains, each pointed at the page it is about. These carry no content
// of their own, so every path on them resolves to that one page.
const PARKED_DOMAIN_TARGET = new Map([
  ["letterofexplanation.com", "/letter-of-explanation/"],
  ["www.letterofexplanation.com", "/letter-of-explanation/"],
  ["employmentverificationletter.com", "/employment-verification-letter/"],
  ["www.employmentverificationletter.com", "/employment-verification-letter/"],
]);

// A preview host must never be indexed: it duplicates the live site page for
// page. Every response on a non-production host carries X-Robots-Tag: noindex.
const withNoindex = async (next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export const onRequest = (context) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  if (hostname === CANONICAL_HOST) return next();
  if (isNonProductionHost(hostname)) return withNoindex(next);

  // Redirecting a POST turns it into a GET, which would silently break a form
  // or an /api call aimed at the wrong host. Only navigations get moved.
  if (request.method !== "GET" && request.method !== "HEAD") return next();

  const parked = PARKED_DOMAIN_TARGET.get(hostname);
  const target = parked
    ? `https://${CANONICAL_HOST}${parked}`
    : `https://${CANONICAL_HOST}${url.pathname}${url.search}`;

  return Response.redirect(target, 301);
};

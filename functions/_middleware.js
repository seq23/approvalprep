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

// App view (?app=1): the phone app opens its legal and help pages with this flag (apps/mobile/src/more.ts).
// The page is served without the site menu, footer and breadcrumbs, and every link onward is turned into
// plain text, so nothing opened from the app leads to buying on the website (App Review 3.1.1). The check
// that the live pages stay that way: scripts/ops/post-deploy-live-check.mjs (appViewProblems).
const APP_VIEW_REMOVE = "header.site-header, nav.secondary-nav, nav.breadcrumbs, footer.site-footer";
const isAppView = (url) => url.searchParams.get("app") === "1";
const appView = async (next) => {
  const response = await next();
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;
  const out = new HTMLRewriter()
    .on(APP_VIEW_REMOVE, { element: (el) => el.remove() })
    .on("a[href]", { element: (el) => { if (!/^(mailto|tel):/i.test(el.getAttribute("href") || "")) el.removeAndKeepContent(); } })
    .transform(response);
  const headers = new Headers(out.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
};

export const onRequest = (context) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  if (hostname === CANONICAL_HOST) return isAppView(url) ? appView(next) : next();
  if (isNonProductionHost(hostname)) return withNoindex(isAppView(url) ? () => appView(next) : next);

  // Redirecting a POST turns it into a GET, which would silently break a form
  // or an /api call aimed at the wrong host. Only navigations get moved.
  if (request.method !== "GET" && request.method !== "HEAD") return next();

  const parked = PARKED_DOMAIN_TARGET.get(hostname);
  const target = parked
    ? `https://${CANONICAL_HOST}${parked}`
    : `https://${CANONICAL_HOST}${url.pathname}${url.search}`;

  return Response.redirect(target, 301);
};

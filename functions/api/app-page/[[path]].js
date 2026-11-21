// App view: the phone app opens its legal and help pages here (apps/mobile/src/more.ts, appPage).
// /api/app-page/terms/ serves the static /terms/ page without the site menu, footer and breadcrumbs,
// and turns every link onward into plain text (mailto/tel kept), so nothing opened from the app leads
// to buying on the website (App Review 3.1.1). Only the pages the app opens are served; anything else
// is a 404. A Function under /api/* because public pages stay off Functions (pages-header-publication).
// Live check: scripts/ops/post-deploy-live-check.mjs (appViewProblems).
export const APP_PAGES = ["/privacy/", "/credit-repair-disclaimer/", "/terms/", "/disclaimer/", "/refund-policy/", "/contact/"];
const REMOVE = "header.site-header, nav.secondary-nav, nav.breadcrumbs, footer.site-footer";

export async function onRequestGet({ request, env, params }) {
  const parts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const page = `/${parts.join("/")}/`.replace(/\/+/g, "/");
  if (!APP_PAGES.includes(page)) return new Response("Not found", { status: 404 });
  const source = await env.ASSETS.fetch(new URL(page, request.url));
  if (!source.ok) return new Response("Not found", { status: 404 });
  const out = new HTMLRewriter()
    .on(REMOVE, { element: (el) => el.remove() })
    .on("a[href]", { element: (el) => { if (!/^(mailto|tel):/i.test(el.getAttribute("href") || "")) el.removeAndKeepContent(); } })
    .transform(source);
  const headers = new Headers({ "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", "cache-control": "public, max-age=300" });
  return new Response(out.body, { status: 200, headers });
}

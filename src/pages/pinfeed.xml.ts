import type { APIRoute } from "astro";
import { loadPinfeed, loadQueue, renderFeedAt } from "../lib/pinfeed.mjs";

// Pinterest RSS feed, static fallback rendered at build time. In production the
// request-time Pages Function functions/pinfeed.xml.js answers /pinfeed.xml with
// the same renderFeedAt() at the request's clock, so a queued pin appears on its
// release day (America/Chicago) with no deploy. Served as application/rss+xml by
// the /pinfeed.xml rule in public/_headers.
export const GET: APIRoute = async () =>
  new Response(renderFeedAt(loadPinfeed(), loadQueue(), new Date()), { headers: { "content-type": "application/rss+xml; charset=utf-8" } });

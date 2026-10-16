import type { APIRoute } from "astro";
import { loadPinfeed, renderPinfeed } from "../lib/pinfeed.mjs";

// Pinterest RSS feed. Served as application/rss+xml by the /pinfeed.xml rule in public/_headers.
export const GET: APIRoute = async () =>
  new Response(renderPinfeed(loadPinfeed()), { headers: { "content-type": "application/rss+xml; charset=utf-8" } });

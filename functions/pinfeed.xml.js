// /pinfeed.xml at REQUEST time (owner-approved daily Pinterest drip, 16 Oct 2026).
// Pinterest's RSS auto-publish polls this URL. The queue (data/pinterest/queue.json)
// carries every variant with its release date; this function shows the 11 launch
// items plus every variant due today in America/Chicago, newest 50 at most, so a
// pin goes live on its day with no daily deploy. The static dist/pinfeed.xml built
// by Astro is the same render at build time and is what validate:pinterest-launch
// reads. Guarded by validate:pinterest-drip.
import feed from "../data/pinterest/pinfeed.json";
import queue from "../data/pinterest/queue.json";
import { renderFeedAt } from "../src/lib/pinfeed-core.mjs";

export const onRequestGet = () =>
  new Response(renderFeedAt(feed, queue, new Date()), {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      // Short cache: a release flips at Chicago midnight; Pinterest polls far less often.
      "cache-control": "public, max-age=900",
      "x-pinfeed-mode": "request-time",
    },
  });

export const onRequestHead = (ctx) => {
  const res = onRequestGet(ctx);
  return new Response(null, { status: res.status, headers: res.headers });
};

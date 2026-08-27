import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://approvalprep.com",
  output: "static",
  // The static build emits directory output, which Cloudflare Pages serves as
  // `/foo/` with a 200 and 308-redirects `/foo`. Declaring "never" here said the
  // opposite of what the deployed site does, which is how the sitemap and every
  // canonical tag came to name the redirecting form. "always" matches reality.
  trailingSlash: "always"
});

import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function fail(message) { console.error(message); process.exit(1); }
function walk(dir) { const full = path.join(root, dir); if (!fs.existsSync(full)) return []; const out = []; for (const entry of fs.readdirSync(full, { withFileTypes: true })) { const next = path.join(full, entry.name); if (entry.isDirectory()) out.push(...walk(path.relative(root, next))); else out.push(next); } return out; }

// --- the published build output ---------------------------------------------
//
// `dist/` is gitignored, so every validator that measures the built tree has to
// answer the same question first: is the tree there at all? Each one answered it
// separately, and they did not agree. seo-aeo-geo-surfaces, internal-url-form,
// sitemap-url-form, outbound-link-health and amazon-book-landing-pages hard-fail
// when it is absent. demand-backed-pages downgraded its sitemap-to-render parity
// check to a `note:` line, and credit-boundary-coverage wrapped its whole built-
// page sweep in `if (fs.existsSync("dist"))` - both then printed OK having
// examined zero built pages. On a bare checkout credit-boundary-coverage
// reported `builtPagesChecked=0` and exited 0; with the build present it checks
// 118. A validator that passes while examining nothing is not passing, and the
// two shapes were indistinguishable in a green log.
//
// One code path for the question, so there is one answer and one thing to guard.
// The directory is whatever Cloudflare is told to publish, never a hardcoded
// "dist" - if wrangler.toml moves it, the validators move with it.
//
// APPROVALPREP_BUILD_OUTPUT_DIR exists so validate:build-output-contract can
// point a validator at a tree that is not there and confirm it refuses, every CI
// run, rather than trusting that it would. Nothing else sets it.
const BUILD_OUTPUT_DIR_ENV = "APPROVALPREP_BUILD_OUTPUT_DIR";
const normalizeDir = (value) => value.replace(/^\.\//, "").replace(/\/+$/, "");

function publishedDir() {
  const override = process.env[BUILD_OUTPUT_DIR_ENV];
  if (override) return normalizeDir(override);
  try {
    const wrangler = fs.readFileSync(path.join(root, "wrangler.toml"), "utf8");
    const match = wrangler.match(/^\s*pages_build_output_dir\s*=\s*["']([^"']+)["']/m);
    if (match) return normalizeDir(match[1]);
  } catch {
    // wrangler.toml is asserted by validate:pages-header-publication, which
    // reports its absence as the deploy defect it is. Falling back here keeps
    // that one failure in one place instead of restating it in every validator.
  }
  return "dist";
}

// Call before reading the built tree. Returns the published directory, or exits
// 1 naming the validator - never returns having found nothing to measure.
function requireBuildOutput(name) {
  const dir = publishedDir();
  const missing = !fs.existsSync(path.join(root, dir))
    ? `${dir}/ does not exist`
    : !fs.existsSync(path.join(root, dir, "index.html"))
      ? `${dir}/ has no index.html, so it is not a completed build`
      : null;
  if (missing) {
    fail(
      `[${name}] FAIL: ${missing}. This validator measures the published build output, so it would ` +
        `examine zero built pages and report a pass over nothing. Run \`npm run build\` first - in the ` +
        `validator registry that build is validator 1, so every lane gets it. Refusing to pass on an absent tree.`
    );
  }
  return dir;
}

export { root, readJson, exists, fail, walk, publishedDir, requireBuildOutput, BUILD_OUTPUT_DIR_ENV };

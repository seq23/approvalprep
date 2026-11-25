// Shared HTML-to-text helpers (CodeQL fixes, 25 Nov 2026).
// - Element removal matches any closing-tag form: </script>, </SCRIPT >, </script foo>.
// - Removal and tag stripping repeat until stable, so nested input cannot re-form a tag.

/** Remove every <tag ...>...</tag ...> element (case-insensitive), repeating until none is left. */
export function removeElements(html, tags, sep = ' ') {
  let out = String(html ?? '');
  for (const tag of tags) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\b[^>]*>`, 'gi');
    let prev;
    do { prev = out; out = out.replace(re, sep); } while (out !== prev);
  }
  return out;
}

/** Remove HTML comments, repeating until none is left. */
export function removeComments(html, sep = ' ') {
  let out = String(html ?? ''), prev;
  do { prev = out; out = out.replace(/<!--[\s\S]*?-->/g, sep); } while (out !== prev);
  return out;
}

/** Replace every tag with `sep`, repeating until no tag is left. */
export function stripTags(html, sep = ' ') {
  let out = String(html ?? ''), prev;
  do { prev = out; out = out.replace(/<[^>]+>/g, sep); } while (out !== prev);
  return out;
}

/** Escape every RegExp metacharacter in a literal string. */
export const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** JSON safe to inline inside <script>: no "</script>", no "<!--", no line separators. */
export const inlineJson = (v) => JSON.stringify(v).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

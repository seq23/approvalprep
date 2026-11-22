// The bureau dispute-address pages print the same addresses, sources and checked dates as the
// Letter Studio's dispute letter: one list (letterStudioCore.mjs `bureaus`), never a copy. The page
// registry holds tokens such as {{ADDR_INLINE:equifax}}; this fills them from that list.
import { bureaus } from "./letterStudioCore.mjs";

const byId = Object.fromEntries(bureaus.map((b) => [b.id, b]));
const day = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const need = (id) => { const b = byId[id]; if (!b) throw new Error(`NAMED STOP [BUREAU_UNKNOWN] ${id}`); return b; };
const inline = (b) => b.lines.join(", ");
export const bureauRows = () => bureaus.map((b) => [b.name, inline(b), day(b.source.read)]);
const TOKENS = {
  ADDR: (id) => need(id).lines.join("\n"),
  ADDR_INLINE: (id) => inline(need(id)),
  CHECKED: (id) => day(need(id).source.read),
  SRCLABEL: (id) => need(id).source.label,
  SRCURL: (id) => need(id).source.url,
};
function fill(value) {
  if (typeof value === "string") {
    if (value === "{{BUREAU_ROWS}}") return bureauRows();
    const out = value
      .replace(/\{\{ADDR_ALL\}\}/g, () => bureaus.map((b) => `${b.name}: ${inline(b)}`).join(" · "))
      .replace(/\{\{([A-Z_]+):([a-z]+)\}\}/g, (_, token, id) => {
        if (!TOKENS[token]) throw new Error(`NAMED STOP [BUREAU_TOKEN_UNKNOWN] ${token}`);
        return TOKENS[token](id);
      });
    if (/\{\{[^}]*\}\}/.test(out)) throw new Error(`NAMED STOP [BUREAU_TOKEN_LEFT] ${out.slice(0, 80)}`);
    return out;
  }
  if (Array.isArray(value)) return value.map(fill);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)]));
  return value;
}
export const resolveBureauPage = (page) => fill(page);

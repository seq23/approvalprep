// A one-page letter as a PDF, built in the browser with no library and no network call.
// Plain PDF 1.4 with the built-in Helvetica faces, so nothing is downloaded and nothing is stored.
// Takes the parts that buildLetter() returns (src/lib/letterStudioCore.mjs).

// Helvetica advance widths for characters 32..126 (Adobe font metrics, units of 1/1000 em).
const W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const CP1252 = { "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "…": 0x85, "€": 0x80 };
const byteOf = (ch) => { const c = ch.codePointAt(0); if (CP1252[ch]) return CP1252[ch]; if (c >= 32 && c <= 126) return c; if (c >= 160 && c <= 255) return c; return 63; };
const widthOf = (text, size, bold = false) => { let w = 0; for (const ch of text) { const c = ch.codePointAt(0); w += c >= 32 && c <= 126 ? W[c - 32] : 556; } return (w * size * (bold ? 1.07 : 1)) / 1000; };
const hex = (text) => { let h = ""; for (const ch of text) h += byteOf(ch).toString(16).padStart(2, "0"); return `<${h}>`; };

function wrap(text, size, maxWidth) {
  const out = []; let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(next, size) > maxWidth) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

const PAGE = { w: 612, h: 792, margin: 72, footer: 54 };

/** Lay the letter out at one type size; returns drawing rows and the height used. */
function layout(letter, size, banner) {
  const lead = Math.round(size * 1.38 * 10) / 10, maxW = PAGE.w - PAGE.margin * 2, rows = [];
  let y = PAGE.h - PAGE.margin;
  const put = (text, opts = {}) => { rows.push({ text, y, size, ...opts }); y -= lead; };
  const gap = (n = 1) => { y -= lead * n; };
  if (banner) { rows.push({ text: banner, y, size: 9, bold: true, mark: true }); y -= lead * 2; }
  letter.sender.forEach((t) => put(t)); gap();
  put(letter.date); gap();
  if (letter.recipient.length) { letter.recipient.forEach((t) => put(t)); gap(); }
  put(`Re: ${letter.subject}`, { bold: true });
  letter.reference.forEach((t) => wrap(t, size, maxW).forEach((line) => put(line)));
  gap(); put(letter.salutation); gap();
  letter.paragraphs.forEach((p, i) => { wrap(p, size, maxW).forEach((line) => put(line, { mark: i === letter.highlight })); gap(); });
  put(letter.closing); gap(2.4); put(letter.signature);
  if (letter.enclosures.length) {
    gap();
    if (letter.enclosures.length === 1) wrap(`Enclosure: ${letter.enclosures[0]}`, size, maxW).forEach((line) => put(line));
    else { put("Enclosures:"); letter.enclosures.forEach((e) => wrap(`-  ${e}`, size, maxW).forEach((line) => put(line))); }
  }
  return { rows, bottom: y + lead, lead };
}

/** A plain second sheet: a heading, numbered lines and small print (the "Before you mail" page). */
function sheetRows(sheet) {
  const maxW = PAGE.w - PAGE.margin * 2, rows = [];
  let y = PAGE.h - PAGE.margin;
  rows.push({ text: sheet.title, y, size: 16, bold: true, mark: true }); y -= 34;
  sheet.lines.forEach((line, i) => { wrap(`${i + 1}.  ${line}`, 11.5, maxW).forEach((t) => { rows.push({ text: t, y, size: 11.5 }); y -= 17; }); y -= 9; });
  y -= 8;
  for (const note of sheet.notes || []) { wrap(note, 9.5, maxW).forEach((t) => { rows.push({ text: t, y, size: 9.5 }); y -= 13.5; }); y -= 7; }
  return rows;
}

export function buildLetterPdf(letter, { footer = "", banner = "", sheet = null } = {}) {
  // Shrink the type a little before spilling to a second page: a letter reads best on one sheet.
  let size = 11, plan = layout(letter, size, banner);
  while (plan.bottom < PAGE.footer + 20 && size > 9) { size -= 0.5; plan = layout(letter, size, banner); }
  const floor = PAGE.footer + 20, pageSpan = PAGE.h - PAGE.margin - floor;
  const pages = [[]];
  for (const row of plan.rows) {
    const drop = PAGE.h - PAGE.margin - row.y, index = Math.floor(drop / pageSpan);
    while (pages.length <= index) pages.push([]);
    pages[index].push({ ...row, y: row.y + index * pageSpan });
  }
  if (sheet) pages.push(sheetRows(sheet));
  const streams = pages.map((rows) => {
    let s = "";
    for (const r of rows) if (r.mark && r.text) s += `1 0.878 0.4 rg ${PAGE.margin - 3} ${(r.y - r.size * 0.28).toFixed(1)} ${(widthOf(r.text, r.size, r.bold) + 6).toFixed(1)} ${(r.size * 1.28).toFixed(1)} re f\n`;
    s += "0.114 0.11 0.129 rg\n";
    for (const r of rows) if (r.text) s += `BT /${r.bold ? "F2" : "F1"} ${r.size} Tf ${PAGE.margin} ${r.y.toFixed(1)} Td ${hex(r.text)} Tj ET\n`;
    if (footer) {
      const fy = PAGE.footer - 12;
      s += `0.851 0.816 0.745 RG 0.75 w ${PAGE.margin} ${PAGE.footer} m ${PAGE.w - PAGE.margin} ${PAGE.footer} l S\n`;
      // The ApprovalPrep mark: an orange ticked checkbox.
      s += `1 0.478 0.239 rg ${PAGE.margin} ${fy - 2} 9 9 re f\n0.114 0.11 0.129 RG 1.3 w ${PAGE.margin + 2} ${fy + 2.6} m ${PAGE.margin + 3.9} ${fy + 0.6} l ${PAGE.margin + 7.2} ${fy + 5} l S\n`;
      s += "0.341 0.325 0.298 rg\n";
      wrap(footer, 7.5, PAGE.w - PAGE.margin * 2 - 16).forEach((line, i) => { s += `BT /F1 7.5 Tf ${PAGE.margin + 15} ${(fy - i * 10).toFixed(1)} Td ${hex(line)} Tj ET\n`; });
    }
    return s;
  });

  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalog = add(""), tree = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids = streams.map((s) => {
    const content = add(`<< /Length ${s.length} >>\nstream\n${s}endstream`);
    return add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
  objects[tree - 1] = `<< /Type /Pages /Count ${kids.length} /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] >>`;
  let pdf = "%PDF-1.4\n", offsets = [];
  objects.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i);
  return bytes;
}

export const LETTER_PDF_FOOTER = "Drafted with ApprovalPrep (approvalprep.com). Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.";

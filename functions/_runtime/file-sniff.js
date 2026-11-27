// What an uploaded file really is, read from its first bytes. The browser's `file.type` is whatever the
// caller says, so a page, a script or an SVG could be stored under a PDF key and handed to buyers
// (security audit 27 Nov 2026, check 17). Only the four kinds the admin uploader takes are named here.
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const startsWith = (b, sig, at = 0) => b.length >= at + sig.length && sig.every((x, i) => b[at + i] === x);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** The real type of `bytes` (an ArrayBuffer or Uint8Array), or null when it is none of the four. */
export function sniffType(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (startsWith(b, ascii('%PDF-'))) return 'application/pdf';
  if (startsWith(b, PNG)) return 'image/png';
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8)) return 'image/webp';
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) {
    // A .docx is a zip whose entry names (stored uncompressed) include [Content_Types].xml and word/.
    // Any other zip (an .xlsx, an .epub, a plain archive) is not a Word document.
    const text = new TextDecoder('latin1').decode(b);
    if (text.includes('[Content_Types].xml') && text.includes('word/document.xml')) return DOCX_MIME;
  }
  return null;
}

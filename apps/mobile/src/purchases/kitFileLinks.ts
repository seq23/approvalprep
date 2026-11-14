// The pure half of a kit's files: names, labels and which links are trusted (tests run these in Node).
import { websiteKit } from '../websiteKits';
import { color } from '../theme';
export const FILES_ORIGIN = 'https://approvalprep.com';
export type FileType = 'pdf' | 'docx';
export const FILE_TYPES: FileType[] = ['pdf', 'docx'];
export const FILE_LABEL: Record<FileType, string> = { pdf: 'PDF guide', docx: 'Word file' };
export const MIME: Record<FileType, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
export const UTI: Record<FileType, string> = { pdf: 'com.adobe.pdf', docx: 'org.openxmlformats.wordprocessingml.document' };
// A PDF starts "%PDF" and a Word file is a ZIP ("PK\x03\x04"), read as base64.
export const SIGNATURE: Record<FileType, string> = { pdf: 'JVBERg==', docx: 'UEsDBA==' };
export const fileName = (sku: string, type: FileType) => `ApprovalPrep-${sku}.${type}`;

/** Only links to our own signed file route are followed. */
export function validFileLinks(data: unknown, sku: string): { type: FileType; url: string }[] | null {
  const files = (data as { kit?: string; files?: { type?: string; url?: string }[] })?.files;
  if ((data as { kit?: string })?.kit !== sku || !Array.isArray(files) || files.length !== FILE_TYPES.length) return null;
  const out: { type: FileType; url: string }[] = [];
  for (const type of FILE_TYPES) {
    const file = files.find(f => f?.type === type);
    if (!file?.url) return null;
    let url: URL;
    try { url = new URL(file.url); } catch { return null; }
    if (url.origin !== FILES_ORIGIN || url.pathname !== '/api/app-files-file' || url.searchParams.get('kit') !== sku || url.searchParams.get('type') !== type) return null;
    out.push({ type, url: url.href });
  }
  return out;
}

/** The preview's stand-in file: a page that names the real file and what is in it, no kit wording. */
export function previewFilePage(sku: string, type: FileType): string {
  const kit = websiteKit(sku);
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const name = esc(kit?.name ?? sku);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}: ${FILE_LABEL[type]} (preview)</title>`
    + `<style>body{background:${color.paper};color:${color.carbon};font:17px/1.5 system-ui,sans-serif;margin:0;padding:24px 16px;max-width:640px}h1{font-size:24px}p.note{background:${color.highlighter};padding:8px 12px}</style></head><body>`
    + `<p class="note">Preview only. In the phone app this opens the real ${FILE_LABEL[type]} (${esc(fileName(sku, type))}) after a store purchase.</p>`
    + `<h1>${name}: ${FILE_LABEL[type]}</h1><p>What the real file holds:</p><ul>${(kit?.documentNames ?? []).map(d => `<li>${esc(d)}</li>`).join('')}</ul>`
    + `<p>Self-help templates. Not legal or financial advice. We do not contact anyone for you.</p></body></html>`;
}


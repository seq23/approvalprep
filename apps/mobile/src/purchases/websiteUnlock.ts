// A kit bought on approvalprep.com opens in this app at no charge (risk brain: a returning buyer is
// never asked to pay again). She pastes the link from her download page or from the "Your
// ApprovalPrep download link" email; only the order code in it is sent (no name, no email, no answers).
// The server checks the order with Stripe (functions/api/app-website-unlock.js); local state never
// unlocks anything on its own, and only links our own server signed are followed.
import { FILES_ORIGIN, validFileLinks, type FileType } from './kitFileLinks';
import { parseKitTemplates, type KitTemplates } from '../kitTemplates';
import { validBundleKits, type BundleReceipt } from './bundleDelivery';
export const WEBSITE_ORDER_RE = /cs_(?:live|test)_[A-Za-z0-9]{10,200}/;
export const websiteOrderCode = (pasted: string): string | null => WEBSITE_ORDER_RE.exec(pasted.trim())?.[0] ?? null;
export interface WebsiteUnlockDeps {
  saveKit(kit: KitTemplates): Promise<boolean>;
  saveFiles(sku: string, links: { type: FileType; url: string }[]): Promise<void>;
  installBundle(receipt: BundleReceipt): Promise<void>;
}
/** Unlocks what the website order holds; throws a code (ORDER_LINK_INVALID, ORDER_NOT_FOUND, …) otherwise. */
export async function unlockWebsiteOrder(pasted: string, deps: WebsiteUnlockDeps): Promise<{ sku: string }> {
  const order = websiteOrderCode(pasted);
  if (!order) throw Error('ORDER_LINK_INVALID');
  const response = await fetch(`${FILES_ORIGIN}/api/app-website-unlock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data?.stop || data?.error || 'WEBSITE_UNLOCK_UNAVAILABLE');
  const kits = Array.isArray(data.kits) ? data.kits.map(parseKitTemplates) : [];
  const files = Array.isArray(data.files) ? data.files.map((f: { kit?: string }) => ({ sku: String(f?.kit ?? ''), links: validFileLinks(f, String(f?.kit ?? '')) })) : [];
  if (typeof data.sku !== 'string' || kits.some((k: KitTemplates | null) => !k) || !files.length || files.some((f: { links: unknown }) => !f.links)) throw Error('WEBSITE_UNLOCK_UNAVAILABLE');
  if (data.archiveUrl !== undefined) {
    const url = new URL(String(data.archiveUrl));
    if (url.origin !== FILES_ORIGIN || url.pathname !== '/api/app-bundle-file' || !validBundleKits(data.kits)) throw Error('WEBSITE_UNLOCK_UNAVAILABLE');
    await deps.installBundle({ archiveUrl: url.href, kits: data.kits });
  } else for (const kit of kits as KitTemplates[]) if (!await deps.saveKit(kit)) throw Error('WEBSITE_UNLOCK_UNAVAILABLE');
  for (const f of files) await deps.saveFiles(f.sku, f.links!);
  return { sku: data.sku };
}
export function websiteUnlockMessage(result: { sku: string } | Error, preview: boolean): string {
  if (!(result instanceof Error)) return 'Your website kit is on this phone now. Open it from Home or Write a letter.';
  if (result.message === 'ORDER_LINK_INVALID') return 'That does not look like an ApprovalPrep order link. Paste the whole link from your download page or email.';
  if (result.message === 'ORDER_NOT_FOUND') return 'No paid order was found for that link. Check you pasted the whole link.';
  if (result.message === 'TOO_MANY_REQUESTS') return 'Too many tries. Please wait an hour and try again.';
  if (result.message === 'NATIVE_DOWNLOAD_REQUIRED' || preview) return 'Website kits open in the phone app. This preview cannot download them.';
  return 'Your website kit could not be opened right now. Try again when you are online. You do not need to buy it again.';
}
// No link kept? She types the email she paid with; the server searches Stripe and, for a paid,
// unrefunded order, emails the link to that address only (functions/api/email-download-links.js).
// The app never learns whether an order exists: the answer is the same either way.
export const EMAIL_LOOKUP_SENT = "If that email bought a kit, we've sent the link to it. Paste it above when it arrives.";
export const looksLikeEmail = (typed: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(typed.trim());
/** Asks the server to email her order links; returns the line to show. Sends only the address. */
export async function emailWebsiteOrderLinks(typed: string, preview: boolean): Promise<string> {
  if (!looksLikeEmail(typed)) return 'Enter the whole email address you paid with, like name@example.com.';
  if (preview) return 'Email lookup works in the phone app. This preview cannot send it.';
  try {
    const response = await fetch(`${FILES_ORIGIN}/api/email-download-links`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: typed.trim().toLowerCase() }) });
    if (response.status === 429) return 'Too many tries. Please wait an hour and try again.';
    if (response.ok) return EMAIL_LOOKUP_SENT;
  } catch { /* offline: fall through */ }
  return 'We could not send it right now. Try again when you are online. You do not need to buy it again.';
}

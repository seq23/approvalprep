// The website kit's own PDF guide and Word file, opened in the phone app after a store purchase
// (her ruling 13 Nov 2026, "Exact mirror": each in-app kit unlocks the same files the site delivers).
// The objects are the ones the website's own download serves (productAssetKey); nothing new is
// uploaded and no request can choose an R2 path: the kit must be one of the eight below.
import { productAssetKey } from './asset-keys.js';
import { signingKey } from './app-kit.js';
import { ownsBundle, ownsProduct } from './app-bundle.js';
export const APP_FILE_KITS = {
  'credit-letter-kit': 'ap_credit_kit',
  'letter-of-explanation': 'ap_explanation_kit',
  'income-employment-letter-kit': 'ap_income_employment_kit',
  'rental-application-kit': 'ap_rental_application_kit',
  'loan-prep-letter-kit': 'ap_loan_prep_kit',
  'business-funding-prep-kit': 'ap_business_funding_kit',
  'life-admin-letter-kit': 'ap_life_admin_kit',
};
export const FILE_TYPES = ['pdf', 'docx'];
export const CONTENT_TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
export const isFileKit = kit => typeof kit === 'string' && Object.hasOwn(APP_FILE_KITS, kit);
/** The kit's own product, or the bundle (or its upgrade), live and not refunded. */
export const ownsFileKit = (purchases, kit, sandbox = false) => isFileKit(kit) && (ownsProduct(purchases, APP_FILE_KITS[kit], sandbox) || ownsBundle(purchases, sandbox));
export const fileKey = (kit, type) => productAssetKey(kit, type);
const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
export async function signedFileUrl(origin, secret, kit, type, now = Date.now()) {
  if (!isFileKit(kit) || !FILE_TYPES.includes(type)) throw Error('KIT_NOT_AVAILABLE');
  const expires = Math.floor(now / 1000) + 300;
  const sig = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(`app-files:${kit}:${type}:${expires}`));
  return `${origin}/api/app-files-file?kit=${kit}&type=${type}&expires=${expires}&sig=${hex(sig)}`;
}
export async function validFileUrl(url, secret, now = Date.now()) {
  const kit = url.searchParams.get('kit'), type = url.searchParams.get('type');
  const expires = Number(url.searchParams.get('expires')), sig = url.searchParams.get('sig') || '';
  if (!secret || !isFileKit(kit) || !FILE_TYPES.includes(type) || !Number.isInteger(expires) || expires <= now / 1000 || expires > now / 1000 + 300 || !/^[a-f0-9]{64}$/.test(sig)) return false;
  return crypto.subtle.verify('HMAC', await signingKey(secret), Uint8Array.from(sig.match(/../g), h => parseInt(h, 16)), new TextEncoder().encode(`app-files:${kit}:${type}:${expires}`));
}

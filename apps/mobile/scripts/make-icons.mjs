// Makes the app icon, Android adaptive icon and splash from the approved mark
// (assets/approvalprep-mark.svg, design system https://claude.ai/artifact/BKh2xEmgb1wAitJ9Tq9N4T).
// sharp is resolved from the repo root's node_modules (a site dependency); run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const at = (f) => fileURLToPath(new URL(`../assets/${f}`, import.meta.url));
const tick = (size, inset) => `<path d="M15 33 L27 45 L49 19" fill="none" stroke="#1D1C21" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(${inset} ${inset}) scale(${(size - 2 * inset) / 64})"/>`;
// iOS: full-bleed signal square (the store rounds the corners), carbon tick.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#FF7A3D"/>${tick(1024, 160)}</svg>`;
// Android adaptive: tick only inside the 66% safe zone; the background colour is set in app.config.ts.
const adaptive = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${tick(1024, 300)}</svg>`;
await sharp(Buffer.from(icon)).flatten({ background: '#FF7A3D' }).png().toFile(at('icon.png'));
await sharp(Buffer.from(adaptive)).png().toFile(at('adaptive-icon.png'));
await sharp(at('approvalprep-mark.svg'), { density: 1200 }).resize(512, 512).png().toFile(at('splash.png'));
console.log('icons: icon.png adaptive-icon.png splash.png');

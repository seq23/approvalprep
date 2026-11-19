// Brand social posts for ApprovalPrep (Instagram @approvalprep via ApprovalPrep's own Buffer since 18 Nov 2026),
// made at $0 from the Pinterest pin copy (spry brain, 8 Nov 2026: "4-6 slide carousels
// ... reused from the Pinterest pin designs, plus one screen-recorded tool video a week
// per brand ... posts via the second Buffer a few a week"). ApprovalPrep has no TikTok
// yet (ApprovalPrep's free Buffer holds Instagram + Threads, 2 of 3 channels), so Instagram only.
//
// Pure functions only. scripts/brand_social/render_posts.mjs draws the slides and the
// video; scripts/brand_social/queue_posts.mjs hands due posts to Buffer.
// Tests: tests/brand-social/posts.test.mjs.
//
// Copy rules (design-approvalprep, approved 6 Nov 2026; risk R-ADV-13):
// - every word on a slide comes from scripts/pinterest/pin_copy.mjs (hand-checked against
//   its page): no prices, no outcome promises, nothing the page does not say;
// - free step first: "Draft free in the Letter Studio ›";
// - every credit carousel carries the credit line on every slide.
import { PIN_COPY } from '../pinterest/pin_copy.mjs';

export const SITE = 'https://approvalprep.com';
export const STUDIO_PATH = '/letter-writing-studio/';
export const CREDIT_LINE = 'Self-help templates. Not legal or financial advice. We do not contact bureaus or creditors for you.';
export const TAGLINE = 'Dispute it yourself. Skip the monthly fee.';

export const isCredit = (slug) => /credit|609|goodwill/.test(slug);

/** The hashtag set for a page: plan.hashtags[topic] or plan.hashtags.default. */
export function topicOf(slug) {
  if (isCredit(slug)) return 'credit';
  if (/rent|apartment|landlord/.test(slug)) return 'rental';
  if (/employ|income/.test(slug)) return 'income';
  if (/business|sba/.test(slug)) return 'business';
  if (/loan|mortgage|car/.test(slug)) return 'loan';
  return 'default';
}
/** The researched tags for a topic (data/brand-social/hashtags.json), never a banned one. */
export function tagsFor(slug, doc) {
  const set = doc.sets[topicOf(slug)] ?? doc.sets.default;
  const banned = new Set((doc.banned ?? []).map((t) => t.toLowerCase()));
  return set.map((t) => t.tag).filter((t) => !banned.has(t.toLowerCase()));
}

export function postLink(pagePath, platform, postId) {
  const url = new URL(pagePath, SITE);
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', 'brand-social');
  url.searchParams.set('utm_content', postId);
  return url.toString();
}

/** Pin copy entries with a checklist of 5+ lines, in pin_copy order. */
export function carouselSlugs(copy = PIN_COPY) {
  return Object.entries(copy).filter(([, v]) => Array.isArray(v.checklist) && v.checklist.length >= 5).map(([slug]) => slug);
}

const halves = (list) => { const k = Math.ceil(list.length / 2); return [list.slice(0, k), list.slice(k)]; };

/**
 * One carousel: cover (the pin headline), the checklist over two slides, the opening of
 * the sample letter when the page has one, and the Letter Studio close.
 */
export function carouselFor(slug, hashtags, copy = PIN_COPY) {
  const c = copy[slug];
  if (!c || !Array.isArray(c.checklist) || c.checklist.length < 5) return null;
  const credit = isCredit(slug);
  const id = `ap-${slug}-c1`;
  const [a, b] = halves(c.checklist);
  const headline = c.headlines?.[0] ?? c.titles?.[0];
  const slides = [
    { kind: 'cover', eyebrow: c.phrases?.[0] ?? slug.replace(/-/g, ' '), headline, tagline: TAGLINE },
    { kind: 'list', label: `What to include · 1 of 2`, items: a },
    { kind: 'list', label: `What to include · 2 of 2`, items: b }
  ];
  const letter = c.letters?.[0];
  if (letter) slides.push({ kind: 'letter', label: 'How it opens', re: letter.re, greeting: letter.greeting, body: letter.body.slice(0, 3) });
  slides.push({ kind: 'close', headline: 'Write yours in minutes.', primary: 'Draft free in the Letter Studio ›', site: 'approvalprep.com' });
  for (const s of slides) if (credit) s.credit = CREDIT_LINE;
  const caption = [
    `${headline}: what to include.`,
    '',
    ...c.checklist.map((line) => `☐ ${line}`),
    '',
    'Draft yours free in the Letter Studio, no account: link in bio.',
    ...(credit ? ['', CREDIT_LINE] : [])
  ].join('\n');
  return { id, type: 'carousel', page: `/${slug}/`, title: headline, credit, slides, caption, hashtags: tagsFor(slug, hashtags) };
}

/**
 * The weekly tool video: the free Letter Studio, filled in live on the site. Each week a
 * different situation, with sample facts in plain words (no real person, no account
 * numbers, no score or removal claims).
 */
export const VIDEO_SCRIPTS = [
  { situation: 'rental', label: 'a rental application', recipient: 'The leasing office', happened: 'I changed jobs in March and had a two-week gap in pay.', now: 'I have been at my new job since April and paid rent on time every month.' },
  { situation: 'income', label: 'a gap in income', recipient: 'The loan officer', happened: 'I left my job in June to care for a family member and returned in September.', now: 'I am back full time with the same employer.' },
  { situation: 'loan', label: 'a large deposit', recipient: 'The underwriter', happened: 'The deposit on 2 May was a gift from my parents toward the down payment.', now: 'A signed gift letter and the bank transfer record are attached.' },
  { situation: 'credit', label: 'a late payment', recipient: 'The underwriter', happened: 'One card payment was late in February while I was in the hospital.', now: 'Every payment since has been on time.' }
];

export function videoFor(week, hashtags) {
  const script = VIDEO_SCRIPTS[week % VIDEO_SCRIPTS.length];
  const credit = script.situation === 'credit' || script.situation === 'credit-dispute';
  const id = `ap-studio-video-w${week}`;
  const caption = [
    `Explaining ${script.label}? Answer a few questions and the free Letter Studio puts it in proper letter form.`,
    '',
    'No account. Nothing stored on our side: link in bio.',
    ...(credit ? ['', CREDIT_LINE] : [])
  ].join('\n');
  return { id, type: 'video', page: STUDIO_PATH, title: 'The free Letter Studio', week, script, credit, caption, hashtags: tagsFor(script.situation, hashtags) };
}

export function weekIndex(now) {
  return Math.floor((Date.parse(new Date(now).toISOString().slice(0, 10)) - Date.parse('2026-01-05')) / (7 * 86_400_000));
}

export function roomInQueue({ channelScheduled, orgScheduled, perChannelMax, orgLimit }) {
  return Math.max(0, Math.min(perChannelMax - channelScheduled, orgLimit - orgScheduled));
}

export function nextPosts({ carousels, video, posted, room }) {
  const out = [];
  if (video && !posted.has(video.id)) out.push(video);
  for (const c of carousels) if (!posted.has(c.id)) out.push(c);
  return out.slice(0, room);
}

export function tagsForPlatform(post, platform, tiktokMax = 5) {
  const tags = post.hashtags ?? [];
  return platform === 'tiktok' ? tags.slice(0, tiktokMax) : tags;
}

/** The exact text a platform posts: the caption, a blank line, its hashtags. */
export function postText(post, platform, tiktokMax = 5) {
  const tags = tagsForPlatform(post, platform, tiktokMax);
  return tags.length ? `${post.caption}\n\n${tags.join(' ')}` : post.caption;
}

export function hashtagsFresh(doc, now) {
  return new Date(now).toISOString().slice(0, 10) <= doc.refresh_by;
}

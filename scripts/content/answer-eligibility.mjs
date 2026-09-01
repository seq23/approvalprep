// Which routes a preparation question can honestly be asked about.
//
// The generator built every title by stamping a fixed question onto a route's
// own title: `How should I prepare for ${route.title}?`. It selected routes by
// risk and index status, which says nothing about whether the route is a
// *subject* someone prepares for. So it produced "How should I prepare for
// Pricing?", "...for Resources?", "...for ApprovalPrep Glossary?",
// "...for ApprovalPrep Methodology?" and "...for ApprovalPrep Document
// Readiness Index?" - a question nobody asks, answered by a generic review
// checklist with nothing to do with the page it names.
//
// The route manifest already records what each page *is*, in `page_intent`.
// That is the discriminator: a guide, a tool, or a template is a document
// situation a person prepares for. A price list, a resource hub, a glossary, a
// methodology statement, a section index and a data report are navigational or
// institutional surfaces - the question is nonsense against them however it is
// phrased. Gating on page_intent means a new utility route cannot be swept in
// by a future run, which a slug deny-list would not prevent.
export const ANSWERABLE_PAGE_INTENTS = new Set([
  "guide",
  "flagship_guide",
  "source_backed_guide",
  "tool",
  "free_tool",
  "template",
  "product",
]);

export const pageIntentByPath = (manifest) =>
  new Map((manifest.routes || []).map((route) => [route.path, route.page_intent]));

export const isAnswerableRoute = (route) =>
  Boolean(route) && ANSWERABLE_PAGE_INTENTS.has(route.page_intent);

// Where a retired answer page should send its traffic: the page it was
// nominally about.
export const canonicalTargetForRoute = (routePath) => `${String(routePath).replace(/\/+$/, "")}/`;

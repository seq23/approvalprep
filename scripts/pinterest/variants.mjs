// Pin variant copy for the daily Pinterest drip ($0: template copy only, no model).
//
// PAGE_COPY is hand-written per page, each line checked against that page's own
// content (16 Oct 2026). No prices anywhere: prices drift and the feed would lie.
// A page with no entry here (a new active_paid kit in data/products/products.json,
// or a new guide in data/content/priority_pages.json) still joins the queue on the
// next refill through derivedCopy(), which only restates the page's own name,
// question, outcome and includes list.
//
// Each headline carries an ANGLE; the image treatment (LAYOUTS x PALETTES) rotates
// independently, so every variant differs in headline, angle and look.

export const LAYOUTS = ["band-top", "art-top", "checklist", "card", "split"];
export const PALETTES = ["teal", "navy", "plum", "forest", "brick", "slate"];
export const ANGLES = ["problem-first", "checklist-first", "deadline-first", "whats-inside", "question-first", "self-service", "mistake-first", "situation-first"];
export const VARIANTS_PER_PAGE_PER_BATCH = 6;

const H = (angle, headline, sub) => ({ angle, headline, sub });

export const PAGE_COPY = {
  "letter-of-explanation": {
    name: "Letter of Explanation Kit",
    bullets: ["9 editable DOCX letters", "PDF writing guide", "Self-review checklist"],
    lines: [
      H("problem-first", "Lender asking you to explain a credit gap?", "Templates for 9 explanation-letter situations"),
      H("checklist-first", "Letter of explanation checklist", "Say what happened, attach proof, review, send"),
      H("deadline-first", "Need a letter of explanation this week?", "Pick the template, fill it in yourself, send it"),
      H("whats-inside", "What's in the Letter of Explanation Kit", "Editable DOCX letters plus a PDF guide"),
      H("question-first", "What goes in a letter of explanation?", "Fill-in prompts and examples for each situation"),
      H("self-service", "Write your own letter of explanation", "Self-service templates; you stay in control"),
      H("mistake-first", "What to leave out of an explanation letter", "The kit covers what to attach and what to avoid"),
      H("situation-first", "Income gap or late payment? Explain it in writing", "Letters for credit, income, address and more"),
    ],
  },
  "income-employment-letter-kit": {
    name: "Income + Employment Letter Kit",
    bullets: ["Employment verification", "Proof of income", "Job change or gap letter"],
    lines: [
      H("problem-first", "Landlord or lender wants proof of income?", "Letters that explain your work and income"),
      H("checklist-first", "Proof of income letter checklist", "Verification, income and job-change letters"),
      H("deadline-first", "Application due? Get your income letters ready", "Fill in the templates, attach real documents"),
      H("whats-inside", "Six income and employment letter templates", "Including a bank statement explanation"),
      H("question-first", "Self-employed? Show your income in writing", "A self-employment income letter template"),
      H("self-service", "Fill in your own employment letters", "Editable DOCX plus a PDF guide"),
      H("mistake-first", "Explain a job change before they ask", "A job change letter, ready to fill in"),
      H("situation-first", "Employment gap? Explain it clearly", "An employment gap letter template"),
    ],
  },
  "credit-letter-kit": {
    name: "Credit Letter Kit",
    bullets: ["Credit dispute letter", "Goodwill letter", "Debt validation letter"],
    lines: [
      H("problem-first", "Spotted a possible error on your credit report?", "Dispute and follow-up letter templates"),
      H("checklist-first", "Credit report error checklist", "Plus dispute, goodwill and validation letters"),
      H("deadline-first", "Applying soon? Sort your credit letters first", "Templates you write and send yourself"),
      H("whats-inside", "Credit letters from dispute to follow-up", "Seven templates and checklists in one kit"),
      H("question-first", "What is a goodwill letter for a late payment?", "A goodwill letter template, ready to fill in"),
      H("self-service", "DIY credit letters you write and send", "Not credit repair; no promised results"),
      H("mistake-first", "Ask a collector to validate a debt", "A debt validation letter template"),
      H("situation-first", "Late payment on your report? Write a goodwill letter", "Plus a late payment explanation letter"),
    ],
  },
  "rental-application-kit": {
    name: "Rental Application Kit",
    bullets: ["Proof of income checklist", "Rental history letter", "Rental cover letter"],
    lines: [
      H("problem-first", "Apartment application stuck on paperwork?", "Get your packet complete before you apply"),
      H("checklist-first", "Apartment application checklist", "Income, rental history and cover letter"),
      H("deadline-first", "Viewing this weekend? Have your packet ready", "Letters and checklists for renters"),
      H("whats-inside", "Nine rental letters and checklists", "From cover letter to move-in documents"),
      H("question-first", "What goes in a renter document packet?", "A packet checklist plus letter templates"),
      H("self-service", "Build your own rental application packet", "Editable DOCX plus a PDF guide"),
      H("mistake-first", "Gap in rental history? Explain it up front", "A rental history explanation template"),
      H("situation-first", "First apartment? Prep your documents first", "A checklist for every page of the packet"),
    ],
  },
  "loan-prep-letter-kit": {
    name: "Loan Prep Letter Kit",
    bullets: ["Income explanation", "Credit explanation", "Bank statement explanation"],
    lines: [
      H("problem-first", "Lender asking about your bank statements?", "A bank statement explanation letter template"),
      H("checklist-first", "Loan document checklist", "Plus the letters lenders ask for"),
      H("deadline-first", "Car loan this week? Prep your letters now", "An auto loan explanation letter template"),
      H("whats-inside", "Letters for auto, personal and mortgage loans", "Explanation letters plus a lender follow-up"),
      H("question-first", "What might a lender ask you to explain?", "Credit, income, job changes and bank activity"),
      H("self-service", "Prepare your own loan explanation letters", "Self-service; we are not a lender"),
      H("mistake-first", "Job change before a mortgage? Explain it", "A mortgage explanation letter template"),
      H("situation-first", "Before the loan review: get your letters in order", "Checklists and templates in one kit"),
    ],
  },
  "business-funding-prep-kit": {
    name: "Business Funding Prep Kit",
    bullets: ["SBA document checklist", "Use of funds explanation", "Cash flow explanation"],
    lines: [
      H("problem-first", "Lender questions about your cash flow?", "A cash flow explanation letter template"),
      H("checklist-first", "SBA document checklist", "Plus letters for lender review"),
      H("deadline-first", "SBA application soon? Organize documents now", "Checklists and letters for business funding"),
      H("whats-inside", "Eight business funding letters and checklists", "From use of funds to lender follow-up"),
      H("question-first", "How do you explain use of funds to a lender?", "A use of funds explanation template"),
      H("self-service", "Prep your own business loan paperwork", "Self-service; not a lender, broker or accountant"),
      H("mistake-first", "Explain unusual bank activity before they ask", "A business bank statement explanation"),
      H("situation-first", "Small business loan? Start with a checklist", "Organize documents before lender review"),
    ],
  },
  "life-admin-letter-kit": {
    name: "Life Admin Letter Kit",
    bullets: ["Address verification letter", "Proof of residency letter", "Records request letter"],
    lines: [
      H("problem-first", "Need proof of address or residency?", "Address and residency letter templates"),
      H("checklist-first", "Everyday paperwork checklist", "Address, identity and records letters"),
      H("deadline-first", "Form due? Send your records request today", "A general records request letter template"),
      H("whats-inside", "Eight everyday paperwork letters", "Address, residency, identity and accounts"),
      H("question-first", "How do you request records from a school or employer?", "A school and employer request letter"),
      H("self-service", "Write your own address and records letters", "Editable DOCX plus a PDF guide"),
      H("mistake-first", "Name or address mismatch? Explain it on paper", "A name and address explanation template"),
      H("situation-first", "Utility or account issue? Put it in writing", "A utility and account explanation letter"),
    ],
  },
  "complete-approvalprep-bundle": {
    name: "Complete ApprovalPrep Bundle",
    bullets: ["Rental and loan kits", "Credit and income letters", "Business and life admin"],
    lines: [
      H("problem-first", "Renting and borrowing at the same time?", "Rental, loan and income letters in one download"),
      H("checklist-first", "Every ApprovalPrep kit in one download", "Templates and checklists for every kit"),
      H("deadline-first", "Lots of paperwork due? Get every template at once", "One library of letters and checklists"),
      H("whats-inside", "Seven kits, one download", "Letter of explanation to life admin"),
      H("question-first", "Not sure which letter you need?", "Every kit's templates in one library"),
      H("self-service", "Your own library of letter templates", "You prepare and send your own letters"),
      H("mistake-first", "Stop rebuilding the same letters every time", "Editable DOCX templates for every kit"),
      H("situation-first", "Moving and financing? One bundle covers both", "Rental application plus loan prep kits"),
    ],
  },
  "employment-verification-letter": {
    name: "Employment Verification Letter Guide",
    bullets: ["Job title and start date", "Employer contact details", "Signature and date"],
    lines: [
      H("problem-first", "Landlord asked for employment verification?", "What the letter should include"),
      H("checklist-first", "Employment verification letter checklist", "The fields a reviewer may need"),
      H("deadline-first", "Need a verification letter fast? Free template", "Employer and employee versions"),
      H("whats-inside", "Free employment verification letter template", "Plus a field-by-field checklist"),
      H("question-first", "What goes in an employment verification letter?", "A plain guide with a free template"),
      H("self-service", "Employer or employee version: which one?", "Both versions explained"),
      H("mistake-first", "Pay belongs in it only when you authorize it", "What a verification letter should include"),
      H("situation-first", "New job and a new apartment? Verify employment", "A free template for the letter"),
    ],
  },
  "sba-loan-checklist": {
    name: "SBA Loan Checklist",
    bullets: ["Tax returns", "Financial statements", "Use of funds"],
    lines: [
      H("problem-first", "Applying for an SBA loan? Start here", "The documents lenders typically ask for"),
      H("checklist-first", "SBA loan document checklist", "Work through it before you apply"),
      H("deadline-first", "SBA lender meeting soon? Gather these first", "Tax returns, statements, plan and more"),
      H("whats-inside", "Documents SBA lenders typically ask for", "As a checklist you can work through"),
      H("question-first", "What documents do you need for an SBA loan?", "A plain checklist guide"),
      H("self-service", "Work through the SBA checklist yourself", "Before you apply"),
      H("mistake-first", "Don't forget the debt schedule", "And the rest of the SBA document list"),
      H("situation-first", "Business plan, debt schedule, ownership: the list", "Documents an SBA lender may ask for"),
    ],
  },
  "how-to-get-approved-for-an-apartment": {
    name: "Apartment Approval Guide",
    bullets: ["Income", "Rental history", "Credit and references"],
    lines: [
      H("problem-first", "Worried about your rental application?", "What landlords check, and how to prepare"),
      H("checklist-first", "What landlords check on an application", "Income, rental history, credit, references"),
      H("deadline-first", "Applying this week? Prepare these four things", "A checklist-style guide for renters"),
      H("whats-inside", "A plain apartment application checklist", "Prepare each item honestly before you apply"),
      H("question-first", "How do you get approved for an apartment?", "What landlords check, one item at a time"),
      H("self-service", "Prepare your rental application honestly", "A checklist-style guide"),
      H("mistake-first", "Line up your references before you apply", "And the rest of what landlords check"),
      H("situation-first", "First-time renter? Here's what to prepare", "Income, history, credit and references"),
    ],
  },
};

const titleCase = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

/** Copy for a page with no PAGE_COPY entry: restates only the page's own facts. */
export function derivedCopy(page) {
  if (page.kind === "guide") {
    // Guides: only the page's own topic (from its URL) and its own question.
    const topic = page.slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
    const q = page.question ? clip(page.question, 70) : `${topic}: what to know`;
    const lines = [
      H("question-first", q, "A plain-language guide"),
      H("checklist-first", `${topic}: the short answer`, "The short answer up front, then the details"),
      H("self-service", `${topic}, explained in plain language`, "Read it before you send anything"),
      H("whats-inside", `Read this first: ${topic.toLowerCase()}`, "A plain-language guide"),
      H("situation-first", `Save this: ${topic.toLowerCase()}`, "Plain answers you can come back to"),
      H("deadline-first", `Short on time? ${topic}, in brief`, "The short answer up front"),
    ];
    return { name: clip(topic, 40), bullets: ["The short answer", "The details", "What to do next"], lines, derived: true };
  }
  const name = page.name || titleCase(page.slug);
  const bullets = (page.includes || []).slice(0, 3).map((b) => clip(b.charAt(0).toUpperCase() + b.slice(1), 30));
  const lines = [
    H("whats-inside", `What's inside the ${name}`, bullets.length ? bullets.join(" · ") : "Templates and checklists"),
    H("checklist-first", `${name}: what to have ready`, bullets.length ? bullets.join(" · ") : "A checklist you work through yourself"),
    H("self-service", `Write it yourself: ${name}`, "Self-service; you stay in control"),
    H("deadline-first", `Applying soon? Prep with the ${name}`, "Get your paperwork in order first"),
    H("situation-first", page.outcome ? clip(page.outcome, 70) : `Start with the ${name}`, name),
    H("question-first", `Need letters for ${name.replace(/ kit$/i, "").toLowerCase()}?`, "Self-service letter templates"),
  ];
  return { name, bullets: bullets.length ? bullets : ["Templates", "Checklists", "Self-service"], lines, derived: true };
}

/** The n-th variant (1-based) for a page. */
export function buildVariant(page, n, pageIndex) {
  const copy = PAGE_COPY[page.slug] || derivedCopy(page);
  const line = copy.lines[(n - 1) % copy.lines.length];
  const layout = LAYOUTS[(n - 1 + 2 * pageIndex) % LAYOUTS.length];
  const palette = PALETTES[(n - 1 + pageIndex) % PALETTES.length];
  const title = clip(`${line.headline} | ${copy.name}`, 100);
  const description = clip(`${line.sub}. ${page.baseDescription || ""}`.replace(/\.\.\s/, ". ").trim(), 500);
  return {
    id: `${page.slug}-v${n}`,
    slug: page.slug,
    path: page.path,
    kind: page.kind,
    imageSku: page.imageSku,
    angle: line.angle,
    layout,
    palette,
    headline: line.headline,
    subhead: line.sub,
    bullets: copy.bullets,
    title,
    description,
  };
}

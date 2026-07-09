import productsData from "../../data/products/products.json";
import offeringData from "../../data/products/full_offering_catalog.json";
import nextStepsData from "../../data/content/customer_next_steps.json";
import boundaryData from "../../data/legal/self_service_boundary.json";

export const boundary = boundaryData.footerBoundary;
export const creditBoundary = boundaryData.creditBoundary;
export const doesNotDo = boundaryData.doesNotDo;
export const dataBoundary = boundaryData.dataBoundary;
export const dataDoesNotStore = boundaryData.dataDoesNotStore;
export const limitedOperationalRecords = boundaryData.limitedOperationalRecords;
export const customerNextSteps = nextStepsData.steps;
export const nextStepsShort = nextStepsData.shortCopy;
export const productCards = productsData.products.filter((product) => product.status === "active_paid" && product.stripe_enabled);
export const offeringCategories = offeringData.categories;
export const allOfferings = offeringCategories.flatMap((category) => category.offerings.map((offering) => ({ ...offering, productSku: category.product_sku, productName: category.product_name, price: category.price })));
export const offeringsForSku = (sku) => offeringCategories.find((category) => category.product_sku === sku)?.offerings || [];
export const productForSku = (sku) => productCards.find((product) => product.sku === sku) || offeringCategories.find((category) => category.product_sku === sku);

export const trustSignals = ["No account required", "No stored letter answers", "PDF + editable DOCX", "Stripe-verified download", "You send it yourself", "Self-service only"];
export const howItWorks = ["Choose the situation you need to prepare for.", "Answer plain-language prompts using real facts.", "Download your PDF and editable DOCX files.", "Review everything before you send it yourself."];
export const whyApprovalPrep = ["Built for application pressure, not vague paperwork advice.", "Prompts help you explain real facts clearly without overclaiming.", "Each kit gives you letters, checklists, and next steps in one place.", "Self-service boundaries are built in: no fake documents, no credit repair, no approval promises."];

export const homepageChooser = [
  {
    "title": "I need to explain a situation",
    "copy": "Prepare a clear letter for a gap, issue, late payment, job change, rental question, or other application context.",
    "href": "/letter-of-explanation",
    "product": "Letter of Explanation"
  },
  {
    "title": "I am applying for a rental",
    "copy": "Organize your renter documents, cover letter, income explanation, rental history details, and follow-up materials.",
    "href": "/apartment-application",
    "product": "Rental Application Kit"
  },
  {
    "title": "I have credit questions",
    "copy": "Prepare your own credit dispute, goodwill, late-payment, debt-validation, or follow-up letters. ApprovalPrep does not repair credit for you.",
    "href": "/credit-letter-kit",
    "product": "Credit Letter Kit"
  },
  {
    "title": "I need income or work proof",
    "copy": "Prepare employment, proof-of-income, self-employment, job-change, and employment-gap letters using truthful details.",
    "href": "/income-employment-letter-kit",
    "product": "Income + Employment Letter Kit"
  },
  {
    "title": "I am preparing for financing",
    "copy": "Get document checklists and explanation letters for loan, mortgage, auto, SBA, or business funding review.",
    "href": "/loan-prep-letter-kit",
    "product": "Loan / Funding Prep"
  },
  {
    "title": "I want the whole library",
    "copy": "Get every current ApprovalPrep kit in one bundle so you do not have to choose one paperwork lane today.",
    "href": "/complete-approvalprep-bundle",
    "product": "Complete Bundle"
  }
];

export const productComparison = [
  {
    "product": "Letter of Explanation",
    "bestFor": "One clear explanation letter",
    "includes": "Letter structure, prompts, examples, self-review checklist",
    "price": "$39",
    "href": "/pricing#letter-of-explanation"
  },
  {
    "product": "Income + Employment Letter Kit",
    "bestFor": "Work, income, employment gaps, job changes",
    "includes": "Employment verification, proof of income, self-employment, gap letters",
    "price": "$59",
    "href": "/pricing#income-employment-letter-kit"
  },
  {
    "product": "Credit Letter Kit",
    "bestFor": "DIY credit letters and follow-up",
    "includes": "Dispute, goodwill, late payment, validation, follow-up letters",
    "price": "$59",
    "href": "/pricing#credit-letter-kit"
  },
  {
    "product": "Rental Application Kit",
    "bestFor": "Apartment and rental applications",
    "includes": "Rental checklist, cover letter, income/rental history explanations",
    "price": "$129",
    "href": "/pricing#rental-application-kit"
  },
  {
    "product": "Complete ApprovalPrep Bundle",
    "bestFor": "The full self-service library",
    "includes": "Every current kit, checklist, guide, and letter packet",
    "price": "$249",
    "href": "/pricing#complete-approvalprep-bundle"
  }
];

export const footerGroups = [
  {
    "title": "Products",
    "links": [
      [
        "/letter-of-explanation",
        "Letter of Explanation"
      ],
      [
        "/income-employment-letter-kit",
        "Income + Employment Kit"
      ],
      [
        "/credit-letter-kit",
        "Credit Letter Kit"
      ],
      [
        "/rental-application-kit",
        "Rental Application Kit"
      ],
      [
        "/loan-prep-letter-kit",
        "Loan Prep Kit"
      ],
      [
        "/business-funding-prep-kit",
        "Business Funding Kit"
      ],
      [
        "/life-admin-letter-kit",
        "Life Admin Kit"
      ],
      [
        "/complete-approvalprep-bundle",
        "Complete Bundle"
      ]
    ]
  },
  {
    "title": "Popular Guides",
    "links": [
      [
        "/letter-of-explanation/credit",
        "Credit Letter of Explanation"
      ],
      [
        "/rental-application-checklist",
        "Rental Application Checklist"
      ],
      [
        "/how-to-get-approved-for-an-apartment",
        "Apartment Approval Guide"
      ],
      [
        "/documents-needed-for-car-loan",
        "Auto Loan Documents"
      ],
      [
        "/sba-loan-checklist",
        "SBA Loan Checklist"
      ],
      [
        "/mortgage-document-checklist",
        "Mortgage Checklist"
      ],
      [
        "/moving-checklist",
        "Moving Checklist"
      ]
    ]
  },
  {
    "title": "Company",
    "links": [
      [
        "/pricing",
        "Pricing"
      ],
      [
        "/methodology",
        "Methodology"
      ],
      [
        "/glossary",
        "Glossary"
      ],
      [
        "/contact",
        "Contact"
      ],
      [
        "/security",
        "Security"
      ],
      [
        "/accessibility",
        "Accessibility"
      ]
    ]
  },
  {
    "title": "Legal",
    "links": [
      [
        "/privacy",
        "Privacy"
      ],
      [
        "/terms",
        "Terms"
      ],
      [
        "/disclaimer",
        "Disclaimer"
      ],
      [
        "/refund-policy",
        "Refund Policy"
      ],
      [
        "/credit-repair-disclaimer",
        "Credit Repair Disclaimer"
      ],
      [
        "/not-a-credit-repair-company",
        "Not a Credit Repair Company"
      ],
      [
        "/ai-use-policy",
        "AI Use Policy"
      ],
      [
        "/editorial-policy",
        "Editorial Policy"
      ]
    ]
  },
  {
    "title": "Resources",
    "links": [
      [
        "/resources",
        "Resource Hub"
      ],
      [
        "/blog",
        "Blog"
      ],
      [
        "/llms.txt",
        "llms.txt"
      ],
      [
        "/llms-full.txt",
        "llms-full.txt"
      ],
      [
        "/sitemap.xml",
        "Sitemap"
      ]
    ]
  }
];

export const routeFamilyCopy = {
  "pricing": {
    "label": "Pricing and kit selection",
    "promise": "Compare the kits by situation, not by confusion. The page is designed to help a buyer decide quickly without pretending one document fixes every problem.",
    "prepare": [
      "The situation you are preparing for",
      "Whether you need one letter or a full packet",
      "The deadline you are working against",
      "Any document request you already received"
    ],
    "avoid": [
      "Do not buy a kit expecting ApprovalPrep to send it for you.",
      "Do not choose a credit kit for fake dispute activity.",
      "Do not treat a template as a promise of approval."
    ]
  },
  "letter_studio": {
    "label": "Plain-language explanation letters",
    "promise": "Turn a confusing fact pattern into a truthful, organized explanation that a reviewer can understand without sorting through your whole life story.",
    "prepare": [
      "The issue you need to explain",
      "Relevant dates, names, and amounts",
      "What changed or what you are doing next",
      "Documents that support your explanation"
    ],
    "avoid": [
      "Do not exaggerate or over-explain.",
      "Do not include facts you cannot support.",
      "Do not promise an outcome you do not control."
    ]
  },
  "credit_self_service": {
    "label": "Self-service credit paperwork",
    "promise": "Prepare your own credit letters with careful language, factual support, and clear boundaries. ApprovalPrep does not repair credit or contact bureaus for you.",
    "prepare": [
      "A current copy of your credit report",
      "The exact item or issue you want to address",
      "Copies of supporting documents, not originals",
      "A mailing or upload plan you control"
    ],
    "avoid": [
      "Do not dispute accurate information as false.",
      "Do not claim ApprovalPrep is acting for you.",
      "Do not expect guaranteed deletion, score improvement, or approval."
    ]
  },
  "credit": {
    "label": "Credit letter kit",
    "promise": "Organize DIY credit letters, goodwill requests, late-payment explanations, and follow-up notes without crossing into credit repair service claims.",
    "prepare": [
      "Credit report item details",
      "Account names and dates",
      "Supporting documents",
      "A copy-saving method for your records"
    ],
    "avoid": [
      "Do not send unsupported claims.",
      "Do not buy this expecting third-party representation.",
      "Do not treat sample wording as legal advice."
    ]
  },
  "apartment_rental": {
    "label": "Rental application readiness",
    "promise": "Build a renter packet that makes your facts easier to review before a landlord, property manager, or leasing office asks for more documents.",
    "prepare": [
      "Photo ID",
      "Income proof",
      "Rental history details",
      "Explanation notes for gaps or special circumstances"
    ],
    "avoid": [
      "Do not create fake employment, income, or rental records.",
      "Do not hide relevant facts that the application asks for.",
      "Do not send materials before reviewing them yourself."
    ]
  },
  "rental": {
    "label": "Rental application kit",
    "promise": "Prepare cover letters, document checklists, income explanations, and follow-up materials for a renter packet that feels organized and serious.",
    "prepare": [
      "Applicant names",
      "Income documents",
      "Rental references or history",
      "Any issue that may require explanation"
    ],
    "avoid": [
      "Do not submit fake paystubs or fake references.",
      "Do not promise a landlord something you cannot document.",
      "Do not assume a packet overrides screening criteria."
    ]
  },
  "income_employment": {
    "label": "Income and employment letters",
    "promise": "Prepare truthful income, employment, self-employment, job-change, or gap explanations with enough structure for a reviewer to follow.",
    "prepare": [
      "Employer or client details",
      "Dates of work or income",
      "Recent pay or bank documentation",
      "Any gap, change, or unusual income pattern"
    ],
    "avoid": [
      "Do not invent employment.",
      "Do not change numbers to match an approval target.",
      "Do not send originals unless specifically required."
    ]
  },
  "auto": {
    "label": "Auto loan document prep",
    "promise": "Know what a lender, dealer, or finance office may ask for so you can respond quickly and reduce back-and-forth.",
    "prepare": [
      "Driver license",
      "Income proof",
      "Address proof",
      "Insurance and trade-in details if relevant"
    ],
    "avoid": [
      "Do not overstate income.",
      "Do not ignore lender-specific instructions.",
      "Do not send documents through an insecure channel if another option is provided."
    ]
  },
  "business": {
    "label": "Business funding prep",
    "promise": "Prepare owner, business, revenue, tax, and explanation materials before a bank, SBA lender, or funder asks for missing documents.",
    "prepare": [
      "Business formation details",
      "Revenue records",
      "Tax returns or financial statements",
      "Owner identification and ownership details"
    ],
    "avoid": [
      "Do not use templates to misstate revenue.",
      "Do not treat this as accounting or legal advice.",
      "Do not skip lender-specific requirements."
    ]
  },
  "business_funding": {
    "label": "Business funding kit",
    "promise": "Organize the business story, document checklist, explanation letters, and lender follow-up notes that make a funding packet easier to review.",
    "prepare": [
      "Entity documents",
      "Bank statements or revenue records",
      "Use-of-funds explanation",
      "Owner background details"
    ],
    "avoid": [
      "Do not fabricate traction or contracts.",
      "Do not omit debts or obligations when asked.",
      "Do not treat preparation as underwriting approval."
    ]
  },
  "mortgage": {
    "label": "Mortgage document prep",
    "promise": "Prepare common mortgage documents and explanation notes before underwriting turns a missing item into a delay.",
    "prepare": [
      "Income and asset documents",
      "Housing history",
      "Debt and credit explanations",
      "Gift, deposit, or employment-change context"
    ],
    "avoid": [
      "Do not move money without asking your lender.",
      "Do not send unverifiable explanations.",
      "Do not assume this replaces lender instructions."
    ]
  },
  "loan_prep": {
    "label": "Loan prep kit",
    "promise": "Prepare application support materials for loan, mortgage, auto, SBA, or general funding review without pretending a packet controls underwriting.",
    "prepare": [
      "Application type",
      "Income or revenue proof",
      "Identity and address documents",
      "Any known issue that may need explanation"
    ],
    "avoid": [
      "Do not create fake documents.",
      "Do not send a template without checking the numbers.",
      "Do not rely on ApprovalPrep for legal, lending, or tax advice."
    ]
  },
  "life_admin": {
    "label": "Life admin document prep",
    "promise": "Organize practical documents, letters, and checklists for moves, offices, accounts, and ordinary paperwork pressure.",
    "prepare": [
      "The office or party requesting documents",
      "Deadlines",
      "IDs and proof documents",
      "A folder where you can save copies"
    ],
    "avoid": [
      "Do not send sensitive documents unnecessarily.",
      "Do not skip redaction where appropriate.",
      "Do not assume every office accepts the same format."
    ]
  },
  "moving": {
    "label": "Moving document prep",
    "promise": "Make the paperwork side of moving less chaotic by organizing documents, notices, address updates, and packet items before deadlines stack up.",
    "prepare": [
      "Move date",
      "Lease or housing documents",
      "Address change list",
      "Utility and account details"
    ],
    "avoid": [
      "Do not wait until move week to gather documents.",
      "Do not send private documents to unverified contacts.",
      "Do not forget to save confirmation numbers."
    ]
  },
  "geo_surface": {
    "label": "ApprovalPrep reference",
    "promise": "Use this reference page to understand the language, method, and boundaries behind ApprovalPrep before choosing a kit.",
    "prepare": [
      "The term or method you want clarified",
      "The product path you are comparing",
      "Any question about what ApprovalPrep does not do"
    ],
    "avoid": [
      "Do not treat a glossary as advice.",
      "Do not skip the product-specific page if you need a template.",
      "Do not assume reference pages promise a result."
    ]
  },
  "checkout": {
    "label": "Checkout and download support",
    "promise": "Confirm payment status and access the protected download flow without exposing paid files as public assets.",
    "prepare": [
      "Stripe checkout session",
      "Purchase email",
      "The kit you bought",
      "A secure place to save PDF and DOCX files"
    ],
    "avoid": [
      "Do not share private download links.",
      "Do not refresh repeatedly if Stripe verification is still pending.",
      "Do not use files before reviewing them."
    ]
  },
  "download": {
    "label": "Protected download support",
    "promise": "Access purchased files only after Stripe verification and entitlement confirmation.",
    "prepare": [
      "Your checkout session",
      "The product SKU",
      "A secure device",
      "A plan to save your files"
    ],
    "avoid": [
      "Do not publish paid files publicly.",
      "Do not send unreviewed documents.",
      "Do not assume download access means a third party has accepted your packet."
    ]
  },
  "legal_trust": {
    "label": "Trust and policy",
    "promise": "Understand how ApprovalPrep works, what it stores, what it does not do, and where the user remains responsible.",
    "prepare": [
      "Read the policy that matches your concern",
      "Review refund and privacy terms before buying",
      "Check disclaimers for regulated topics"
    ],
    "avoid": [
      "Do not treat ApprovalPrep as legal, financial, lending, or credit repair advice.",
      "Do not use the site for fake documents.",
      "Do not assume policy pages create professional-client representation."
    ]
  },
  "complete_bundle": {
    "label": "Complete ApprovalPrep bundle",
    "promise": "Use the full library when your paperwork situation crosses more than one lane: income, rental, credit, loans, business funding, and life admin.",
    "prepare": [
      "A list of all active application situations",
      "Known deadlines",
      "Document requests already received",
      "A folder for completed packets"
    ],
    "avoid": [
      "Do not send every template just because it is included.",
      "Do not use a bundle to bypass truthful review.",
      "Do not expect one purchase to guarantee any third-party outcome."
    ]
  }
};

export const routeCopy = {
  "/resources": {
    "heading": "Resources",
    "lead": "ApprovalPrep resources help users find guides, policies, publishing updates, glossary definitions, privacy boundaries, and product paths without guessing where the next piece of content lives.",
    "shortAnswer": "The Resources hub is the organizing layer for ApprovalPrep education. It points users to the blog, methodology, glossary, legal policies, pricing, and the free Studio while keeping the self-service boundary visible.",
    "primaryCta": "Read the publishing hub",
    "secondaryCta": "Start free for $0",
    "decisionContext": [
      "A resource section should not be a pile of footer links. It should explain where the content engine publishes, where users can learn the method, where policies live, and where buyers can return when they are ready to choose a kit.",
      "ApprovalPrep uses Resources as the public map for evergreen guides, daily answer assets, policy pages, and user education. That gives people a recovery path when they are not ready to buy yet, and gives future publishing a visible home."
    ],
    "whoFor": [
      "Users who need education before choosing a kit.",
      "Visitors who want the blog or cadenced publishing stream.",
      "Users checking privacy, disclaimers, refund, or credit-repair boundaries before buying.",
      "Search and LLM crawlers that need a clear map of ApprovalPrep content surfaces."
    ],
    "value": [
      "Separates product buying pages from educational resources.",
      "Gives daily and cadenced publishing a public path instead of hiding it inside JSON or admin artifacts.",
      "Keeps trust, privacy, and self-service boundaries easy to find.",
      "Routes uncertain users back to the free Studio or pricing page instead of leaving them stranded."
    ],
    "whatYouGet": [
      "A public resource hub.",
      "Links to the blog, methodology, glossary, pricing, privacy, and disclaimers.",
      "A plain explanation of where new content goes.",
      "A safe path back to the free Studio or paid kits."
    ],
    "useCases": [
      "You want to read before buying.",
      "You want the latest daily ApprovalPrep answers.",
      "You need privacy or disclaimer information.",
      "You want to understand the method behind the kits."
    ],
    "prepBrief": [
      "Use Resources when the user is not ready for checkout.",
      "Send publishing assets to the blog, not only LLM files.",
      "Keep regulated or approval-required assets governed before promotion.",
      "Make policies and disclaimers visible without overwhelming commercial pages."
    ],
    "commonMistakes": [
      "Treating resources as a footer-only afterthought.",
      "Publishing daily content without a public index.",
      "Mixing legal policy pages into conversion pages without hierarchy.",
      "Letting users hit a dead end after reading an article."
    ],
    "reviewChecklist": [
      "Can the user find the blog?",
      "Can the user find privacy and disclaimers?",
      "Can the user get back to pricing or the free Studio?",
      "Does the page explain where new content goes?",
      "Does it avoid claiming ranking, indexing, or approval outcomes?"
    ],
    "steps": [
      "Choose the resource type.",
      "Read the guide, article, or policy.",
      "Return to the Studio or pricing when ready.",
      "Use only truthful facts in any document you prepare.",
      "Review the self-service boundary before sending anything."
    ],
    "faq": [
      {"question":"Where does new content go?","answer":"Daily and cadenced publishing goes to the Blog, while evergreen policies and method pages remain in Resources."},
      {"question":"Is Resources a paid product?","answer":"No. It is a public navigation and education hub."},
      {"question":"Does reading a resource replace professional advice?","answer":"No. ApprovalPrep is self-service only and does not provide legal, financial, lending, or credit repair advice."}
    ],
    "trustSignals": ["Public resource hub", "Blog publishing path", "Privacy links", "Policy links", "Self-service boundary"]
  },
  "/blog": {
    "heading": "ApprovalPrep Blog",
    "lead": "The ApprovalPrep Blog is the public home for daily and cadenced document-prep publishing: short answers, route-specific explainers, and practical self-service guidance.",
    "shortAnswer": "The Blog answers the question of where ongoing content goes. Published answer assets live here, point back to relevant product or guide pages, and keep users moving toward the right next step.",
    "primaryCta": "Start free for $0",
    "secondaryCta": "Browse resources",
    "decisionContext": [
      "A content engine without a public publishing surface creates hidden work. The answers may exist in JSON, LLM files, or internal reports, but users cannot browse them and search engines cannot treat them as a coherent editorial body.",
      "The Blog solves that by giving daily and cadenced publishing a visible index. Each entry should be useful on its own, but it should also route users back to the related product, guide, policy, or free Studio path."
    ],
    "whoFor": [
      "Users who want short practical answers before choosing a kit.",
      "Visitors coming from search or LLM surfaces who need a next step.",
      "Operators reviewing what has been published versus what still needs approval.",
      "Users who prefer educational content before commercial pages."
    ],
    "value": [
      "Creates a real home for daily publishing.",
      "Turns generated answer assets into a navigable public surface.",
      "Keeps regulated answers visibly governed through approval status.",
      "Supports SEO/AEO/GEO without pretending publication is proof of ranking or citations."
    ],
    "whatYouGet": [
      "A list of published daily answers.",
      "Links back to related product and guide pages.",
      "Clear separation between published and approval-required answer assets.",
      "A publishing path that can expand into individual article pages later."
    ],
    "useCases": [
      "You want quick guidance on a document-prep topic.",
      "You want to see what ApprovalPrep publishes daily.",
      "You need to find the related product page after reading an answer.",
      "You want content that stays inside the self-service boundary."
    ],
    "prepBrief": [
      "Publish only answer assets that have passed the required status rules.",
      "Keep credit-sensitive and regulated content in approval-required state until reviewed.",
      "Link every answer to a relevant route so the reader has a next step.",
      "Avoid ranking, citation, or approval claims without telemetry proof."
    ],
    "commonMistakes": [
      "Letting daily content exist only in machine-readable files.",
      "Publishing answer assets with no user journey.",
      "Mixing approved and approval-required content without clear labels.",
      "Making blog posts that do not point to a useful product, guide, or policy page."
    ],
    "reviewChecklist": [
      "Does the answer have a clear related route?",
      "Does it avoid fake document, credit repair, legal, or approval claims?",
      "Is the risk level visible?",
      "Is the status appropriate before public promotion?",
      "Does the user have a next step after reading?"
    ],
    "steps": [
      "Generate or approve an answer asset.",
      "Confirm its related route and risk level.",
      "Publish approved items to the Blog index.",
      "Keep approval-required items visibly governed.",
      "Route readers to Studio, pricing, product pages, or policies."
    ],
    "faq": [
      {"question":"Is the Blog where daily content goes?","answer":"Yes. The Blog is the public index for daily and cadenced ApprovalPrep publishing."},
      {"question":"Do all generated answers publish automatically?","answer":"No. Regulated or approval-required answers must remain governed until reviewed."},
      {"question":"Does publishing prove ranking or LLM citation wins?","answer":"No. Publication is a content surface. Ranking, indexing, and LLM surfacing require separate telemetry proof."}
    ],
    "trustSignals": ["Daily publishing home", "Related-page links", "Approval queue separation", "Self-service only", "No ranking proof claims"]
  },
  "/letter-writing-studio": {
    "heading": "Free Letter Writing Studio",
    "lead": "Draft a first-pass explanation letter for $0 before you buy anything. No account, no upload, no stored answers, and no payment required.",
    "shortAnswer": "The Studio is a free browser-only drafting tool. It helps you organize messy facts, create a first-pass draft, and choose the paid kit that fits your situation. ApprovalPrep does not store your answers or send anything for you.",
    "primaryCta": "Start for $0",
    "secondaryCta": "Compare paid kits",
    "decisionContext": [
      "Most people do not start with a product name. They start with pressure: a landlord asked a question, a lender wants an explanation, a credit issue needs careful wording, or an office needs a clear note.",
      "The Studio gives that uncertain user a safe first step. It uses local templates and browser-only logic to help them shape a draft without creating an account, uploading documents, or paying before they understand the right path."
    ],
    "whoFor": [
      "People who know they need to explain something but do not know which kit fits.",
      "Buyers who want to start for $0 before choosing a paid template packet.",
      "Anyone who wants a first-pass draft while keeping answers in their own browser."
    ],
    "value": [
      "Reduces anxiety by turning a messy situation into a structured first-pass letter.",
      "Recommends the right paid kit only after the user sees the situation more clearly.",
      "Keeps the free tool zero-cost for ApprovalPrep because it uses static templates, not AI or server-side generation."
    ],
    "whatYouGet": [
      "Situation selection.",
      "Guided drafting prompts.",
      "Browser-only first-pass draft.",
      "Risk and boundary reminders.",
      "Recommended paid kit for the full templates, examples, checklists, and review steps."
    ],
    "prepBrief": [
      "Start with the real situation you need to explain, not the product name you think you need.",
      "Gather dates, facts, names, and supporting documents before drafting.",
      "Keep sensitive documents on your own device. The Studio does not need uploads.",
      "Use the Studio draft as a starting point, then decide whether the paid kit gives you the fuller packet."
    ],
    "commonMistakes": [
      "Writing too much before you know what the reviewer needs.",
      "Including unsupported facts, emotional over-explanations, or promises you do not control.",
      "Treating the free draft as a finished application packet.",
      "Choosing a paid kit before identifying whether the issue is rental, credit, income, loan, business, or life-admin."
    ],
    "reviewChecklist": [
      "Does the draft use only true facts?",
      "Does it avoid legal, credit repair, or approval promises?",
      "Does it name the documents that support the explanation?",
      "Does the recommended kit match the situation you selected?",
      "Do you understand that ApprovalPrep does not store the answers or send the letter for you?"
    ],
    "useCases": [
      "You are not sure whether you need a credit, rental, income, loan, business, or life-admin letter.",
      "You want to organize facts before buying a paid kit.",
      "You want a first-pass draft without storing your answers."
    ],
    "steps": [
      "Choose your situation.",
      "Answer the guided prompts with true facts.",
      "Generate a first-pass draft in your browser.",
      "Review the boundary notes.",
      "Choose the recommended paid kit if you need the full packet."
    ],
    "faq": [
      {"question":"Does the Studio cost anything?","answer":"No. The Letter Writing Studio is free to use and costs $0 to start."},
      {"question":"Does ApprovalPrep store my answers?","answer":"No. The Studio runs in your browser and ApprovalPrep does not store your letter answers, completed drafts, or uploaded documents."},
      {"question":"Is this AI?","answer":"No. The Studio uses static templates and browser-only logic. It does not call an AI API."}
    ],
    "trustSignals": ["$0 to start", "No account required", "No stored answers", "No upload", "Browser-only", "Self-service only"]
  },
  "/pricing": {
    "heading": "Pricing",
    "lead": "Pricing helps you prepare for compare all kits with truthful details, organized supporting documents, and a clear next step before buyer decision becomes urgent.",
    "shortAnswer": "Use this page when you need compare all kits and want a practical way to prepare before buyer decision. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "View product paths",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for compare all kits before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants price confidence without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns buyer decision into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on price confidence: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for compare all kits.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with price confidence.",
      "You know buyer decision may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to compare all kits.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee price confidence?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation": {
    "heading": "Write a clear letter of explanation.",
    "lead": "Letter of Explanation Generator helps you prepare for one clear explanation with truthful details, organized supporting documents, and a clear next step before gap or issue becomes urgent.",
    "shortAnswer": "Use this page when you need one clear explanation and want a practical way to prepare before gap or issue. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Create my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for one clear explanation before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants reviewer confidence without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns gap or issue into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on reviewer confidence: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for one clear explanation.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with reviewer confidence.",
      "You know gap or issue may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to one clear explanation.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee reviewer confidence?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/credit": {
    "heading": "Credit Letter of Explanation",
    "lead": "Credit Letter of Explanation helps you prepare for credit context with truthful details, organized supporting documents, and a clear next step before not credit repair becomes urgent.",
    "shortAnswer": "Use this page when you need credit context and want a practical way to prepare before not credit repair. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for credit context before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Consumers who understand this is DIY paperwork help, not credit repair or bureau representation."
    ],
    "value": [
      "Turns not credit repair into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on supporting facts: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for credit context.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with supporting facts.",
      "You know not credit repair may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to credit context.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "For credit matters, disputing accurate information as false or implying someone else is repairing credit for you."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Review the relevant credit report or account record.",
      "Identify the exact item, date, account, or issue.",
      "Gather supporting documents and save copies.",
      "Draft the letter in plain language using only true facts.",
      "Review the boundary reminders before sending.",
      "Send it yourself and keep proof of delivery."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee supporting facts?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/eviction": {
    "heading": "Eviction Letter of Explanation",
    "lead": "Eviction Letter of Explanation helps you prepare for eviction context with truthful details, organized supporting documents, and a clear next step before housing review becomes urgent.",
    "shortAnswer": "Use this page when you need eviction context and want a practical way to prepare before housing review. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for eviction context before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants changed circumstances without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns housing review into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on changed circumstances: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for eviction context.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with changed circumstances.",
      "You know housing review may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to eviction context.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee changed circumstances?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/income": {
    "heading": "Income Letter of Explanation",
    "lead": "Income Letter of Explanation helps you prepare for income context with truthful details, organized supporting documents, and a clear next step before unusual deposits becomes urgent.",
    "shortAnswer": "Use this page when you need income context and want a practical way to prepare before unusual deposits. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for income context before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants document support without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns unusual deposits into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on document support: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for income context.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with document support.",
      "You know unusual deposits may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to income context.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee document support?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/employment-gap": {
    "heading": "Employment Gap Letter of Explanation",
    "lead": "Employment Gap Letter of Explanation helps you prepare for employment gap with truthful details, organized supporting documents, and a clear next step before timeline clarity becomes urgent.",
    "shortAnswer": "Use this page when you need employment gap and want a practical way to prepare before timeline clarity. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for employment gap before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants what changed without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns timeline clarity into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on what changed: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for employment gap.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with what changed.",
      "You know timeline clarity may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to employment gap.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee what changed?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/employment-verification-letter": {
    "heading": "Employment Verification Letter",
    "lead": "Employment Verification Letter helps you prepare for employment verification with truthful details, organized supporting documents, and a clear next step before truthful work details becomes urgent.",
    "shortAnswer": "Use this page when you need employment verification and want a practical way to prepare before truthful work details. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the income kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for employment verification before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants no fake records without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns truthful work details into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on no fake records: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for employment verification.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with no fake records.",
      "You know truthful work details may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to employment verification.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee no fake records?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/proof-of-income-letter": {
    "heading": "Proof of Income Letter",
    "lead": "Proof of Income Letter helps you prepare for proof of income with truthful details, organized supporting documents, and a clear next step before income source clarity becomes urgent.",
    "shortAnswer": "Use this page when you need proof of income and want a practical way to prepare before income source clarity. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the income kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for proof of income before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants reviewer-ready packet without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns income source clarity into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on reviewer-ready packet: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for proof of income.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with reviewer-ready packet.",
      "You know income source clarity may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to proof of income.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee reviewer-ready packet?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/credit-dispute-letter": {
    "heading": "Credit Dispute Letter Generator",
    "lead": "Credit Dispute Letter Generator helps you prepare for DIY credit dispute with truthful details, organized supporting documents, and a clear next step before specific report item becomes urgent.",
    "shortAnswer": "Use this page when you need DIY credit dispute and want a practical way to prepare before specific report item. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the credit letter kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for DIY credit dispute before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Consumers who understand this is DIY paperwork help, not credit repair or bureau representation."
    ],
    "value": [
      "Turns specific report item into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on consumer recordkeeping: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for DIY credit dispute.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with consumer recordkeeping.",
      "You know specific report item may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to DIY credit dispute.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "For credit matters, disputing accurate information as false or implying someone else is repairing credit for you."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Review the relevant credit report or account record.",
      "Identify the exact item, date, account, or issue.",
      "Gather supporting documents and save copies.",
      "Draft the letter in plain language using only true facts.",
      "Review the boundary reminders before sending.",
      "Send it yourself and keep proof of delivery."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee consumer recordkeeping?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/apartment-application": {
    "heading": "Apartment Ready-to-Apply Kit",
    "lead": "Apartment Ready-to-Apply Kit helps you prepare for rental packet with truthful details, organized supporting documents, and a clear next step before leasing office review becomes urgent.",
    "shortAnswer": "Use this page when you need rental packet and want a practical way to prepare before leasing office review. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the rental kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for rental packet before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants application pressure without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns leasing office review into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on application pressure: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for rental packet.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with application pressure.",
      "You know leasing office review may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to rental packet.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee application pressure?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/rental-application-checklist": {
    "heading": "Rental Application Checklist",
    "lead": "Rental Application Checklist helps you prepare for rental checklist with truthful details, organized supporting documents, and a clear next step before documents before touring becomes urgent.",
    "shortAnswer": "Use this page when you need rental checklist and want a practical way to prepare before documents before touring. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for rental checklist before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants less back-and-forth without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns documents before touring into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on less back-and-forth: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for rental checklist.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with less back-and-forth.",
      "You know documents before touring may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to rental checklist.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee less back-and-forth?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/how-to-get-approved-for-an-apartment": {
    "heading": "How to Get Approved for an Apartment",
    "lead": "How to Get Approved for an Apartment helps you prepare for apartment approval preparation with truthful details, organized supporting documents, and a clear next step before screening readiness becomes urgent.",
    "shortAnswer": "Use this page when you need apartment approval preparation and want a practical way to prepare before screening readiness. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Build my packet",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for apartment approval preparation before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants stronger renter packet without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns screening readiness into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on stronger renter packet: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for apartment approval preparation.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with stronger renter packet.",
      "You know screening readiness may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to apartment approval preparation.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee stronger renter packet?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/auto-loan-documents": {
    "heading": "Auto Loan Documents",
    "lead": "Auto Loan Documents helps you prepare for auto loan documents with truthful details, organized supporting documents, and a clear next step before dealer finance desk becomes urgent.",
    "shortAnswer": "Use this page when you need auto loan documents and want a practical way to prepare before dealer finance desk. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for auto loan documents before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants income and identity proof without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns dealer finance desk into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on income and identity proof: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for auto loan documents.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with income and identity proof.",
      "You know dealer finance desk may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to auto loan documents.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee income and identity proof?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/car-loan-checklist": {
    "heading": "Car Loan Checklist",
    "lead": "Car Loan Checklist helps you prepare for car loan checklist with truthful details, organized supporting documents, and a clear next step before preapproval readiness becomes urgent.",
    "shortAnswer": "Use this page when you need car loan checklist and want a practical way to prepare before preapproval readiness. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for car loan checklist before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants documents before shopping without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns preapproval readiness into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on documents before shopping: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for car loan checklist.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with documents before shopping.",
      "You know preapproval readiness may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to car loan checklist.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee documents before shopping?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/documents-needed-for-car-loan": {
    "heading": "Documents Needed for a Car Loan",
    "lead": "Documents Needed for a Car Loan helps you prepare for car loan document list with truthful details, organized supporting documents, and a clear next step before lender request becomes urgent.",
    "shortAnswer": "Use this page when you need car loan document list and want a practical way to prepare before lender request. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for car loan document list before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants fast response without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns lender request into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on fast response: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for car loan document list.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with fast response.",
      "You know lender request may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to car loan document list.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee fast response?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/sba-loan-checklist": {
    "heading": "SBA Loan Checklist",
    "lead": "SBA Loan Checklist helps you prepare for SBA checklist with truthful details, organized supporting documents, and a clear next step before small business lender becomes urgent.",
    "shortAnswer": "Use this page when you need SBA checklist and want a practical way to prepare before small business lender. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for SBA checklist before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants owner and business records without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns small business lender into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on owner and business records: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for SBA checklist.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with owner and business records.",
      "You know small business lender may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to SBA checklist.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee owner and business records?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/business-loan-documents": {
    "heading": "Business Loan Documents",
    "lead": "Business Loan Documents helps you prepare for business loan documents with truthful details, organized supporting documents, and a clear next step before funding review becomes urgent.",
    "shortAnswer": "Use this page when you need business loan documents and want a practical way to prepare before funding review. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for business loan documents before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants revenue and entity proof without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns funding review into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on revenue and entity proof: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for business loan documents.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with revenue and entity proof.",
      "You know funding review may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to business loan documents.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee revenue and entity proof?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/mortgage-checklist": {
    "heading": "Mortgage Checklist",
    "lead": "Mortgage Checklist helps you prepare for mortgage checklist with truthful details, organized supporting documents, and a clear next step before underwriting readiness becomes urgent.",
    "shortAnswer": "Use this page when you need mortgage checklist and want a practical way to prepare before underwriting readiness. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for mortgage checklist before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants income assets and explanations without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns underwriting readiness into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on income assets and explanations: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for mortgage checklist.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with income assets and explanations.",
      "You know underwriting readiness may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to mortgage checklist.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee income assets and explanations?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/mortgage-document-checklist": {
    "heading": "Mortgage Document Checklist",
    "lead": "Mortgage Document Checklist helps you prepare for mortgage document checklist with truthful details, organized supporting documents, and a clear next step before loan file review becomes urgent.",
    "shortAnswer": "Use this page when you need mortgage document checklist and want a practical way to prepare before loan file review. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for mortgage document checklist before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants missing-item prevention without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns loan file review into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on missing-item prevention: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for mortgage document checklist.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with missing-item prevention.",
      "You know loan file review may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to mortgage document checklist.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee missing-item prevention?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/important-documents-checklist": {
    "heading": "Important Documents Checklist",
    "lead": "Important Documents Checklist helps you prepare for important documents with truthful details, organized supporting documents, and a clear next step before life admin folder becomes urgent.",
    "shortAnswer": "Use this page when you need important documents and want a practical way to prepare before life admin folder. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for important documents before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants faster response without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns life admin folder into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on faster response: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for important documents.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with faster response.",
      "You know life admin folder may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to important documents.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee faster response?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/moving-checklist": {
    "heading": "Moving Checklist",
    "lead": "Moving Checklist helps you prepare for moving checklist with truthful details, organized supporting documents, and a clear next step before address and account changes becomes urgent.",
    "shortAnswer": "Use this page when you need moving checklist and want a practical way to prepare before address and account changes. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for moving checklist before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants deadline control without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns address and account changes into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on deadline control: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for moving checklist.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with deadline control.",
      "You know address and account changes may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to moving checklist.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee deadline control?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/glossary": {
    "heading": "ApprovalPrep Glossary",
    "lead": "ApprovalPrep Glossary helps you prepare for plain-language definitions with truthful details, organized supporting documents, and a clear next step before approval prep terms becomes urgent.",
    "shortAnswer": "Use this page when you need plain-language definitions and want a practical way to prepare before approval prep terms. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for plain-language definitions before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants boundary clarity without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns approval prep terms into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on boundary clarity: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for plain-language definitions.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with boundary clarity.",
      "You know approval prep terms may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to plain-language definitions.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee boundary clarity?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/methodology": {
    "heading": "ApprovalPrep Methodology",
    "lead": "ApprovalPrep Methodology helps you prepare for ApprovalPrep method with truthful details, organized supporting documents, and a clear next step before truthful document preparation becomes urgent.",
    "shortAnswer": "Use this page when you need ApprovalPrep method and want a practical way to prepare before truthful document preparation. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for ApprovalPrep method before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants review before sending without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns truthful document preparation into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on review before sending: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for ApprovalPrep method.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with review before sending.",
      "You know truthful document preparation may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to ApprovalPrep method.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee review before sending?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/checkout/success": {
    "heading": "Checkout Success",
    "lead": "Checkout Success helps you prepare for payment confirmation with truthful details, organized supporting documents, and a clear next step before protected delivery becomes urgent.",
    "shortAnswer": "Use this page when you need payment confirmation and want a practical way to prepare before protected delivery. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for payment confirmation before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants download verification without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns protected delivery into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on download verification: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for payment confirmation.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with download verification.",
      "You know protected delivery may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to payment confirmation.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee download verification?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": true
  },
  "/download": {
    "heading": "Download",
    "lead": "Download helps you prepare for verified download with truthful details, organized supporting documents, and a clear next step before private file access becomes urgent.",
    "shortAnswer": "Use this page when you need verified download and want a practical way to prepare before private file access. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for verified download before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants PDF and DOCX delivery without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns private file access into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on PDF and DOCX delivery: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for verified download.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with PDF and DOCX delivery.",
      "You know private file access may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to verified download.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee PDF and DOCX delivery?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": true
  },
  "/privacy": {
    "heading": "Privacy Policy",
    "lead": "Privacy Policy helps you prepare for privacy policy with truthful details, organized supporting documents, and a clear next step before document handling becomes urgent.",
    "shortAnswer": "This page explains the privacy policy boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for privacy policy before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants customer control without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns document handling into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on customer control: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for privacy policy.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with customer control.",
      "You know document handling may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to privacy policy.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee customer control?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/terms": {
    "heading": "Terms of Use",
    "lead": "Terms of Use helps you prepare for terms of use with truthful details, organized supporting documents, and a clear next step before site responsibilities becomes urgent.",
    "shortAnswer": "This page explains the terms of use boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for terms of use before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants self-service boundary without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns site responsibilities into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on self-service boundary: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for terms of use.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with self-service boundary.",
      "You know site responsibilities may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to terms of use.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee self-service boundary?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/disclaimer": {
    "heading": "Disclaimer",
    "lead": "Disclaimer helps you prepare for disclaimer with truthful details, organized supporting documents, and a clear next step before no professional advice becomes urgent.",
    "shortAnswer": "This page explains the disclaimer boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for disclaimer before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Consumers who understand this is DIY paperwork help, not credit repair or bureau representation."
    ],
    "value": [
      "Turns no professional advice into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on no approval guarantee: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for disclaimer.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with no approval guarantee.",
      "You know no professional advice may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to disclaimer.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "For credit matters, disputing accurate information as false or implying someone else is repairing credit for you."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Review the relevant credit report or account record.",
      "Identify the exact item, date, account, or issue.",
      "Gather supporting documents and save copies.",
      "Draft the letter in plain language using only true facts.",
      "Review the boundary reminders before sending.",
      "Send it yourself and keep proof of delivery."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee no approval guarantee?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/refund-policy": {
    "heading": "Refund Policy",
    "lead": "Refund Policy helps you prepare for refund policy with truthful details, organized supporting documents, and a clear next step before digital download expectations becomes urgent.",
    "shortAnswer": "This page explains the refund policy boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for refund policy before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants purchase clarity without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns digital download expectations into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on purchase clarity: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for refund policy.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with purchase clarity.",
      "You know digital download expectations may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to refund policy.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee purchase clarity?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/security": {
    "heading": "Security",
    "lead": "Security helps you prepare for security posture with truthful details, organized supporting documents, and a clear next step before private downloads becomes urgent.",
    "shortAnswer": "This page explains the security posture boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for security posture before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants limited document handling without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns private downloads into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on limited document handling: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for security posture.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with limited document handling.",
      "You know private downloads may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to security posture.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee limited document handling?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/accessibility": {
    "heading": "Accessibility",
    "lead": "Accessibility helps you prepare for accessibility with truthful details, organized supporting documents, and a clear next step before plain language becomes urgent.",
    "shortAnswer": "This page explains the accessibility boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for accessibility before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants usable document prep without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns plain language into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on usable document prep: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for accessibility.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with usable document prep.",
      "You know plain language may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to accessibility.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee usable document prep?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/contact": {
    "heading": "Contact",
    "lead": "Contact helps you prepare for contact options with truthful details, organized supporting documents, and a clear next step before support boundaries becomes urgent.",
    "shortAnswer": "This page explains the contact options boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for contact options before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants purchase or access questions without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns support boundaries into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on purchase or access questions: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for contact options.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with purchase or access questions.",
      "You know support boundaries may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to contact options.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee purchase or access questions?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/editorial-policy": {
    "heading": "Editorial Policy",
    "lead": "Editorial Policy helps you prepare for editorial standards with truthful details, organized supporting documents, and a clear next step before truthful guidance becomes urgent.",
    "shortAnswer": "This page explains the editorial standards boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for editorial standards before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants source-backed claims without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns truthful guidance into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on source-backed claims: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for editorial standards.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with source-backed claims.",
      "You know truthful guidance may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to editorial standards.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee source-backed claims?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/ai-use-policy": {
    "heading": "AI Use Policy",
    "lead": "AI Use Policy helps you prepare for AI use policy with truthful details, organized supporting documents, and a clear next step before drafting assistance becomes urgent.",
    "shortAnswer": "This page explains the AI use policy boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for AI use policy before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants human review responsibility without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns drafting assistance into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on human review responsibility: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for AI use policy.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with human review responsibility.",
      "You know drafting assistance may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to AI use policy.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee human review responsibility?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/credit-repair-disclaimer": {
    "heading": "Credit Repair Disclaimer",
    "lead": "Credit Repair Disclaimer helps you prepare for credit repair disclaimer with truthful details, organized supporting documents, and a clear next step before DIY letters only becomes urgent.",
    "shortAnswer": "This page explains the credit repair disclaimer boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for credit repair disclaimer before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Consumers who understand this is DIY paperwork help, not credit repair or bureau representation."
    ],
    "value": [
      "Turns DIY letters only into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on regulated boundary: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for credit repair disclaimer.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with regulated boundary.",
      "You know DIY letters only may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to credit repair disclaimer.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "For credit matters, disputing accurate information as false or implying someone else is repairing credit for you."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Review the relevant credit report or account record.",
      "Identify the exact item, date, account, or issue.",
      "Gather supporting documents and save copies.",
      "Draft the letter in plain language using only true facts.",
      "Review the boundary reminders before sending.",
      "Send it yourself and keep proof of delivery."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee regulated boundary?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/not-a-credit-repair-company": {
    "heading": "Not a Credit Repair Company",
    "lead": "Not a Credit Repair Company helps you prepare for not a credit repair company with truthful details, organized supporting documents, and a clear next step before no bureau contact becomes urgent.",
    "shortAnswer": "This page explains the not a credit repair company boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "Start my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for not a credit repair company before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Consumers who understand this is DIY paperwork help, not credit repair or bureau representation."
    ],
    "value": [
      "Turns no bureau contact into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on self-service credit prep: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for not a credit repair company.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with self-service credit prep.",
      "You know no bureau contact may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to not a credit repair company.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "For credit matters, disputing accurate information as false or implying someone else is repairing credit for you."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Review the relevant credit report or account record.",
      "Identify the exact item, date, account, or issue.",
      "Gather supporting documents and save copies.",
      "Draft the letter in plain language using only true facts.",
      "Review the boundary reminders before sending.",
      "Send it yourself and keep proof of delivery."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee self-service credit prep?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/income-employment-letter-kit": {
    "heading": "Income + Employment Letter Kit",
    "lead": "Income + Employment Letter Kit helps you prepare for income employment kit with truthful details, organized supporting documents, and a clear next step before work and income explanations becomes urgent.",
    "shortAnswer": "Use this page when you need income employment kit and want a practical way to prepare before work and income explanations. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the income kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for income employment kit before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants packet preparation without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns work and income explanations into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on packet preparation: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for income employment kit.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with packet preparation.",
      "You know work and income explanations may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to income employment kit.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee packet preparation?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/credit-letter-kit": {
    "heading": "Credit Letter Kit",
    "lead": "Credit Letter Kit helps you prepare for credit letter kit with truthful details, organized supporting documents, and a clear next step before DIY credit letters becomes urgent.",
    "shortAnswer": "Use this page when you need credit letter kit and want a practical way to prepare before DIY credit letters. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the credit letter kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for credit letter kit before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Consumers who understand this is DIY paperwork help, not credit repair or bureau representation."
    ],
    "value": [
      "Turns DIY credit letters into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on careful boundaries: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for credit letter kit.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with careful boundaries.",
      "You know DIY credit letters may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to credit letter kit.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "For credit matters, disputing accurate information as false or implying someone else is repairing credit for you."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Review the relevant credit report or account record.",
      "Identify the exact item, date, account, or issue.",
      "Gather supporting documents and save copies.",
      "Draft the letter in plain language using only true facts.",
      "Review the boundary reminders before sending.",
      "Send it yourself and keep proof of delivery."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee careful boundaries?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/rental-application-kit": {
    "heading": "Rental Application Kit",
    "lead": "Rental Application Kit helps you prepare for rental application kit with truthful details, organized supporting documents, and a clear next step before renter packet becomes urgent.",
    "shortAnswer": "Use this page when you need rental application kit and want a practical way to prepare before renter packet. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the rental kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for rental application kit before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants leasing follow-up without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns renter packet into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on leasing follow-up: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for rental application kit.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with leasing follow-up.",
      "You know renter packet may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to rental application kit.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee leasing follow-up?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/loan-prep-letter-kit": {
    "heading": "Loan Prep Letter Kit",
    "lead": "Loan Prep Letter Kit helps you prepare for loan prep kit with truthful details, organized supporting documents, and a clear next step before funding review becomes urgent.",
    "shortAnswer": "Use this page when you need loan prep kit and want a practical way to prepare before funding review. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the loan prep kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for loan prep kit before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants document readiness without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns funding review into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on document readiness: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for loan prep kit.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with document readiness.",
      "You know funding review may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to loan prep kit.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee document readiness?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/business-funding-prep-kit": {
    "heading": "Business Funding Prep Kit",
    "lead": "Business Funding Prep Kit helps you prepare for business funding kit with truthful details, organized supporting documents, and a clear next step before business lender packet becomes urgent.",
    "shortAnswer": "Use this page when you need business funding kit and want a practical way to prepare before business lender packet. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the business funding kit",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for business funding kit before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants owner explanation materials without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns business lender packet into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on owner explanation materials: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for business funding kit.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with owner explanation materials.",
      "You know business lender packet may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to business funding kit.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee owner explanation materials?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/life-admin-letter-kit": {
    "heading": "Life Admin Letter Kit",
    "lead": "Life Admin Letter Kit helps you prepare for life admin kit with truthful details, organized supporting documents, and a clear next step before everyday paperwork becomes urgent.",
    "shortAnswer": "Use this page when you need life admin kit and want a practical way to prepare before everyday paperwork. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Create my letter",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for life admin kit before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants organized response without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns everyday paperwork into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on organized response: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for life admin kit.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with organized response.",
      "You know everyday paperwork may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to life admin kit.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee organized response?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  },
  "/complete-approvalprep-bundle": {
    "heading": "Complete ApprovalPrep Bundle",
    "lead": "Complete ApprovalPrep Bundle helps you prepare for complete bundle with truthful details, organized supporting documents, and a clear next step before multi-situation prep becomes urgent.",
    "shortAnswer": "Use this page when you need complete bundle and want a practical way to prepare before multi-situation prep. ApprovalPrep helps you organize the facts, choose the right supporting documents, avoid unsafe claims, and leave with a packet or next step you can review before sending yourself.",
    "primaryCta": "Get the complete bundle",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "Most people arrive here because a reviewer, landlord, lender, bureau, employer, office, or internal deadline has created paperwork pressure. The expensive mistake is not simply missing a template; it is sending scattered facts, unsupported claims, or documents that do not answer the question being asked.",
      "The stronger move is to slow the situation down enough to prepare a clean explanation, match it with the right proof, and keep a copy trail. ApprovalPrep is built for that moment: practical, self-service, and careful about boundaries."
    ],
    "whoFor": [
      "People preparing for complete bundle before a deadline or follow-up request gets stressful.",
      "Applicants who want their facts, dates, and documents in one organized place.",
      "People who will review and send their own materials instead of hiring a service to act for them.",
      "Anyone who wants full document library without pretending preparation can guarantee approval."
    ],
    "value": [
      "Turns multi-situation prep into a concrete preparation path instead of a vague worry.",
      "Separates what you know, what you can document, and what you still need to gather.",
      "Uses plain language so the final packet sounds like a real person, not a legal threat or generic internet form.",
      "Builds in review prompts that reduce overclaiming, missing dates, and unsupported statements.",
      "Keeps the decision-maker focused on full document library: clear facts, relevant documents, and a reasonable next step."
    ],
    "whatYouGet": [
      "A page-specific preparation path for complete bundle.",
      "Prompts for the facts a reviewer is likely to need.",
      "Checklist-style guidance for documents, dates, and supporting proof.",
      "Safety reminders about fake documents, guarantees, and third-party contact.",
      "A next-step structure you can use before buying a kit or sending a completed packet."
    ],
    "useCases": [
      "You were asked for more information and need to respond with full document library.",
      "You know multi-situation prep may raise questions and want to prepare before it becomes a problem.",
      "You need a truthful explanation but do not want to over-share, under-explain, or sound defensive.",
      "You want a self-service workflow with clear boundaries and no account requirement."
    ],
    "prepBrief": [
      "Write down the exact question, concern, or document request connected to complete bundle.",
      "Gather proof before writing: IDs, statements, letters, pay records, leases, reports, receipts, or confirmations as applicable.",
      "Create a timeline with dates and amounts so the explanation does not drift.",
      "Decide what you are asking the reviewer to do next: consider, update, verify, accept, review, or follow up.",
      "Save a copy of anything you send and note the date, method, and recipient."
    ],
    "commonMistakes": [
      "Sending a long emotional story without the facts a reviewer needs.",
      "Using a generic template that does not match the actual request.",
      "Attaching documents without explaining why they matter.",
      "Making promises, guarantees, or legal-sounding threats that do not fit the situation.",
      "Waiting until the deadline to discover a missing document or unclear date."
    ],
    "reviewChecklist": [
      "Does every statement use truthful, supportable facts?",
      "Are dates, names, amounts, and account or property details checked?",
      "Did you remove anything unnecessary, inflammatory, or unsupported?",
      "Did you include only copies of supporting documents unless originals are required?",
      "Do you understand that ApprovalPrep does not send the packet or guarantee the result?"
    ],
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      {
        "question": "Can ApprovalPrep guarantee full document library?",
        "answer": "No. ApprovalPrep helps you prepare clearer materials. It does not control landlord, lender, employer, bureau, office, or reviewer decisions."
      },
      {
        "question": "Does ApprovalPrep send documents for me?",
        "answer": "No. ApprovalPrep is self-service. You review, download, and send your own materials."
      },
      {
        "question": "Can I use this if my situation is complicated?",
        "answer": "You can use it to organize facts and questions, but complicated legal, tax, lending, immigration, court, or regulated issues may require a qualified professional."
      },
      {
        "question": "Can I change the template wording?",
        "answer": "Yes. The point is to make the language truthful to your situation before you send anything."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only",
      "No fake document help"
    ],
    "noindexCtaAllowed": false
  }
};

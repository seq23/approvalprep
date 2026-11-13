import productsData from "../../data/products/products.json";
import offeringData from "../../data/products/full_offering_catalog.json";
import nextStepsData from "../../data/content/customer_next_steps.json";
import boundaryData from "../../data/legal/self_service_boundary.json";
import generatedRouteCopyData from "../../data/content/generated_route_copy.json";

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
// Counts shown to customers are counted from the product data, never typed: the bundle is not a kit.
export const BUNDLE_SKU = "complete-approvalprep-bundle";
export const kitCount = productCards.filter((product) => product.sku !== BUNDLE_SKU).length;
export const kitCountWord = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][kitCount] || String(kitCount);
export const allOfferings = offeringCategories.flatMap((category) => category.offerings.map((offering) => ({ ...offering, productSku: category.product_sku, productName: category.product_name, price: category.price })));
export const offeringsForSku = (sku) => offeringCategories.find((category) => category.product_sku === sku)?.offerings || [];
export const productForSku = (sku) => productCards.find((product) => product.sku === sku) || offeringCategories.find((category) => category.product_sku === sku);

export const trustSignals = ["No account required", "No stored letter answers", "PDF + editable DOCX", "Stripe-verified download", "You send it yourself", "Self-service only"];
export const howItWorks = ["Choose the situation you need to prepare for.", "Answer plain-language prompts using real facts.", "Download your PDF and editable DOCX files.", "Review everything before you send it yourself."];
export const whyApprovalPrep = ["Built for application pressure, not vague paperwork advice.", "Prompts help you explain real facts clearly without overclaiming.", "Each kit gives you letters, checklists, and next steps in one place.", "Self-service boundaries are built in: no fake documents, no credit repair, no approval promises."];

export const homepageChooser = [
  {
    "title": "I need a fast explanation letter",
    "copy": "Use one $15 direct-download kit for credit, income, job gap, address history, late payment, bank statement, rental issue, life event, or general application explanations.",
    "href": "/letter-of-explanation",
    "product": "Letter of Explanation Kit"
  },
  {
    "title": "I want to get apartment-ready",
    "copy": "Build a cleaner rental packet before you apply: cover letter, income explanation, rental history explanation, landlord follow-up, and move-in document checklist.",
    "href": "/apartment-application",
    "product": "Rental Application Kit"
  },
  {
    "title": "I want self-service credit repair letters",
    "copy": "The letters for after your first dispute: bureau follow-ups, a direct dispute to the company that reported the item, debt validation, settlement terms in writing, goodwill and late-payment letters, an error checklist and a mailing log.",
    "href": "/credit-letter-kit",
    "product": "Credit Letter Kit"
  },
  {
    "title": "I need to prove income or explain work",
    "copy": "Prepare employment verification, proof-of-income, self-employment, job-change, employment-gap, and bank-statement explanation letters.",
    "href": "/income-employment-letter-kit",
    "product": "Income + Employment Letter Kit"
  },
  {
    "title": "I need to get loan-ready",
    "copy": "Organize auto, mortgage, personal-loan, income, credit, bank-statement, lender follow-up, and loan document checklist materials before review.",
    "href": "/loan-prep-letter-kit",
    "product": "Loan Prep Letter Kit"
  },
  {
    "title": "I want every current document kit",
    "copy": "Get the full direct-download library: credit letters, explanation letters, rental prep, income proof, loan prep, business funding, and life-admin paperwork.",
    "href": "/complete-approvalprep-bundle",
    "product": "Complete ApprovalPrep Bundle"
  }
];

export const productComparison = [
  {
    "product": "Letter of Explanation",
    "bestFor": "One clear explanation letter",
    "includes": "Nine explanation letters by situation, a filled example under each, a sent and received log",
    "price": "$15",
    "href": "/pricing#letter-of-explanation"
  },
  {
    "product": "Income + Employment Letter Kit",
    "bestFor": "Work, income, employment gaps, job changes",
    "includes": "Employment verification for your employer to sign, proof of income, self-employment, job change and gap letters",
    "price": "$19",
    "href": "/pricing#income-employment-letter-kit"
  },
  {
    "product": "Credit Letter Kit",
    "bestFor": "DIY credit letters and follow-up",
    "includes": "Three bureau follow-ups, direct dispute, validation, settlement terms, goodwill, late payment, checklist, log",
    "price": "$19",
    "href": "/pricing#credit-letter-kit"
  },
  {
    "product": "Rental Application Kit",
    "bestFor": "Apartment and rental applications",
    "includes": "Rental checklist, cover letter, income/rental history explanations",
    "price": "$29",
    "href": "/pricing#rental-application-kit"
  },
  {
    "product": "Complete ApprovalPrep Bundle",
    "bestFor": "The full self-service library",
    "includes": "Every current kit, checklist, guide, and letter packet",
    "price": "$49",
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
        "/employment-verification-letter",
        "Employment Verification Letter"
      ],
      [
        "/609-dispute-letter",
        "609 Dispute Letter"
      ],
      [
        "/goodwill-letter-to-remove-late-payment",
        "Goodwill Letter"
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
        "/about",
        "About"
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
        "/sitemap.xml",
        "Sitemap"
      ]
    ]
  }
];

export const routeFamilyCopy = {
  "pricing": {
    "label": "Pricing and kit selection",
    "promise": "Each kit is listed with what is inside and its price. Pick the one that matches the paperwork in front of you.",
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
    "promise": "DIY credit letters, goodwill requests, late-payment explanations and follow-up notes in one kit. You fill them in and mail them yourself.",
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

const manualRouteCopy = {
  // Section indexes for the three route families that publish children under a
  // URL prefix - tools, templates and public_reports in route_manifest.json -
  // and previously had nothing at the prefix itself.
  "/tools": {
    "primaryCta": "Compare the paid kits",
    "secondaryCta": "Draft free in the Letter Studio",
    "heading": "Free ApprovalPrep Document Checklists",
    "metaDescription": "Six free ApprovalPrep checklists for apartment applications, proof of income, business funding, mortgages, car loans, and your important documents.",
    "lead": "Six free checklists, one for each application situation ApprovalPrep publishes for: apartment applications, proof of income, small-business funding, mortgage documents, car loans, and the important-documents folder you keep for everything else.",
    "shortAnswer": "Open the checklist that matches the request you actually received, work through it using documents you already have, and only then decide whether a paid kit adds anything. Every checklist here is free, needs no account, and keeps nothing you type.",
    "decisionContext": [
      "Use this section when someone has asked you for paperwork and you are not sure what the full list is supposed to contain. A checklist answers that before you start writing anything.",
      "Each checklist covers one situation rather than paperwork in general, because the documents a leasing office wants are not the documents a small-business lender wants. Pick the one that names your situation and ignore the rest.",
      "A checklist is not a purchase decision. Work through it first. If it turns out you can gather everything yourself and write your own note, you are finished here and it cost nothing."
    ],
    "whoFor": [
      "People who have received a document request and want the complete list before they start gathering.",
      "People who want to know what a reviewer usually asks for before an application is submitted rather than after.",
      "People deciding whether a paid ApprovalPrep kit is worth it, who want to see the free version of the work first.",
      "People helping a family member assemble an application packet and needing a shared list to work from."
    ],
    "value": [
      "Gives each application situation its own list, so nothing is padded with items that do not apply to you.",
      "Puts the free version of the work first, so a purchase is a choice rather than the only way to see anything.",
      "Names the matching paid kit on every checklist without hiding the checklist behind it.",
      "Keeps the self-service boundary visible: these lists help you prepare your own paperwork and nothing more."
    ],
    "whatYouGet": [
      "Six free checklists covering apartment applications, proof of income, business funding, mortgage documents, car loans, and personal document storage.",
      "The specific items a reviewer in that situation commonly asks for, in the order it makes sense to gather them.",
      "A pointer from each checklist to the ApprovalPrep kit built for the same situation, with its price shown.",
      "Answers to the questions people ask about each checklist, published on the checklist itself.",
      "A clear statement of what ApprovalPrep does not do, on every page in this section."
    ],
    "useCases": [
      "A leasing office sent a document request and you want to be sure nothing is missing before you reply.",
      "You are self-employed and need to know what counts as proof of income before a lender asks.",
      "You are gathering business funding paperwork and want the areas listed out rather than remembered.",
      "You want one folder of important documents assembled once so the next application is faster."
    ],
    "prepBrief": [
      "Find the exact wording of the request you received, if there is one.",
      "Note the deadline you are working against.",
      "Collect the documents you already hold before deciding what is missing.",
      "Decide who else needs to supply something, such as an employer or an accountant."
    ],
    "commonMistakes": [
      "Gathering documents from a general paperwork article rather than the list for your actual situation.",
      "Sending an incomplete packet quickly instead of a complete one a few days later.",
      "Producing a document you cannot support because the checklist named it and you wanted a full set.",
      "Skipping the copy trail, so there is no record of what you sent or when you sent it."
    ],
    "reviewChecklist": [
      "Every item on the list is either gathered or deliberately marked as not applicable to you.",
      "Every date, amount, name, and address matches the document it came from.",
      "Nothing in the packet claims something you cannot show evidence for.",
      "You kept a copy of everything and noted the date you sent it."
    ],
    "steps": [
      "Choose the checklist that names your situation.",
      "Work down it and mark what you already hold.",
      "Request the missing items from whoever holds them.",
      "Check each gathered document against the facts you plan to state.",
      "Send the packet yourself and keep a copy of what you sent."
    ],
    "trustSignals": ["Free with no account", "No stored answers", "Self-service only", "Real documents only"],
    "faq": [
      { "question": "Do the checklists cost anything?", "answer": "No. Every checklist in this section is free to read and use, and none of them requires an account or an email address." },
      { "question": "Do I need a paid kit to use a checklist?", "answer": "No. Each checklist names the ApprovalPrep kit built for the same situation, but the checklist works on its own. The paid kit adds letter templates and editable files, not the list." },
      { "question": "Will ApprovalPrep send the documents for me?", "answer": "No. ApprovalPrep is self-service. You gather your own documents, write your own letter, review it yourself, and send it yourself. ApprovalPrep never contacts a landlord, lender, employer, or bureau on your behalf." }
    ]
  },
  "/templates": {
    "primaryCta": "Get the editable kits",
    "secondaryCta": "Draft free in the Letter Studio",
    "heading": "ApprovalPrep Letter Template Previews",
    "metaDescription": "Previews of five ApprovalPrep letters: address history, employment gap, bank deposits, a rental cover letter, and self-employed proof of income.",
    "lead": "Five public previews showing how each ApprovalPrep letter is structured: address history, employment gap, bank statement deposits, a rental application cover letter, and self-employed proof of income.",
    "shortAnswer": "Read the preview for the letter you need, use its structure to draft your own version in plain words, and buy the matching kit only if you want the editable PDF and DOCX files. The previews explain structure; the paid kits carry the files.",
    "decisionContext": [
      "Use this section when you know roughly what you have to explain but not how the explanation is supposed to be laid out. Each preview shows the order the facts belong in.",
      "The previews are public on purpose. A person who can write the letter themselves after reading one has been helped, and that is a better outcome than a page that withholds structure to force a purchase.",
      "What stays behind checkout is the editable file, not the knowledge. If you want a document you can open, fill in, and print, the matching kit is where that lives."
    ],
    "whoFor": [
      "People who have to explain one specific thing and want to see how the explanation is normally organized.",
      "People who write comfortably and only need the shape of the letter, not a fill-in-the-blank file.",
      "People deciding between writing their own letter and buying the editable kit.",
      "People who want to check what a paid kit actually contains before paying for it."
    ],
    "value": [
      "Shows the structure of each letter in public rather than describing it vaguely and charging to see it.",
      "Keeps every preview tied to the situation it was written for, so the ordering advice is specific.",
      "States plainly which paid kit holds the editable file for that letter, and what that file adds.",
      "Holds the same boundary as the rest of the site: truthful facts, real documents, no invented records."
    ],
    "whatYouGet": [
      "Five template previews covering address history, employment gaps, bank statement deposits, rental cover letters, and self-employed income.",
      "The order the facts belong in, from the opening sentence to the specific request you close with.",
      "Guidance on referencing supporting documents without overstating what they prove.",
      "A clear statement of where the public preview ends and the paid editable file begins.",
      "The name and price of the kit that contains the editable version of that letter."
    ],
    "useCases": [
      "A lender asked about a deposit on your bank statement and you need to explain where it came from.",
      "An application asks for your address history and yours has gaps you need to account for.",
      "You have a gap between jobs and want to describe it without over-explaining.",
      "You are self-employed and a reviewer wants your income set out in a way they can follow."
    ],
    "prepBrief": [
      "Write the single thing you have to explain in one sentence.",
      "List the dates, amounts, names, and addresses involved.",
      "Pull the documents that support each of those facts.",
      "Decide what you are actually asking the reviewer to do next."
    ],
    "commonMistakes": [
      "Writing a long history when the reviewer asked about one specific item.",
      "Stating something the attached documents do not actually show.",
      "Leaving out the request, so the reviewer finishes the letter without knowing what you want.",
      "Treating a template as a promise that the application will be approved."
    ],
    "reviewChecklist": [
      "Every fact in the letter matches a document you can produce.",
      "The letter answers the question that was asked and stops there.",
      "The closing states the specific review step you are asking for.",
      "You saved a copy of the letter and the attachments you sent with it."
    ],
    "steps": [
      "Open the preview for the letter you have to write.",
      "Gather the facts and documents it asks you to line up.",
      "Draft the letter in your own words following that order.",
      "Read it back against your documents and cut anything you cannot support.",
      "Send it yourself, or buy the matching kit if you want the editable file."
    ],
    "trustSignals": ["Structure shown in public", "No stored drafts", "Truthful templates only", "Self-service only"],
    "faq": [
      { "question": "Is the preview the whole template?", "answer": "The preview explains the structure and what belongs in each part. The editable PDF and DOCX files stay in the paid kit behind a Stripe-verified download." },
      { "question": "Can I write the letter from the preview alone?", "answer": "Yes. The previews are published so that someone who writes comfortably can follow the structure and produce their own letter without buying anything." },
      { "question": "Will a template guarantee approval?", "answer": "No. A clearer letter is easier for a reviewer to follow, but ApprovalPrep does not promise any application outcome and does not create documents on your behalf." }
    ]
  },
  "/reports": {
    "primaryCta": "Compare the paid kits",
    "secondaryCta": "Draft free in the Letter Studio",
    "heading": "ApprovalPrep Public Reports",
    "metaDescription": "Three ApprovalPrep public reports on what applicants are asked to produce: a checklist catalog, a rental prep report, and a business funding report.",
    "lead": "Three public reports on what applicants are actually asked to produce: a catalog of public application checklists, a rental application prep report, and a small-business funding document prep report.",
    "shortAnswer": "Each report states its own method, lists the sources it was built from, and says what it does not claim. Read the method first, then use the findings to decide what to gather before you apply.",
    "decisionContext": [
      "Use this section when you want the reasoning behind ApprovalPrep's guidance rather than the guidance itself. The reports show which public sources were read and how they were coded.",
      "A report is useful for deciding what to prepare across a whole category. A checklist is better once you know your specific situation, and a letter template is better once you know what you have to explain.",
      "Every report names its limitations in the report itself. Those limits are part of the finding, not a disclaimer bolted onto the end of it."
    ],
    "whoFor": [
      "People who want to see the source material behind a recommendation before acting on it.",
      "People preparing for a category of application and wanting to know what is commonly requested across it.",
      "Writers, advisers, and researchers looking for a citable description of what applicants are asked to produce.",
      "People deciding whether ApprovalPrep's guidance is grounded in anything before they buy a kit."
    ],
    "value": [
      "Publishes the method alongside the finding, so a reader can judge how much weight the finding carries.",
      "Names the public sources each report was built from rather than asserting conclusions without provenance.",
      "States the limits of each report openly, including what the sample does not cover.",
      "Connects each report to the checklists and kits for the same situation without overstating what a report proves."
    ],
    "whatYouGet": [
      "Three public reports covering application checklists in general, rental applications, and small-business funding.",
      "The method used to select and code the sources behind each report.",
      "The document-prep areas each report identifies, described in plain language.",
      "An explicit statement of what each report does not claim.",
      "Links from each report to the checklist, template, or kit built for the same situation."
    ],
    "useCases": [
      "You want to know what rental applications commonly ask for before you start viewing places.",
      "You are preparing for small-business funding conversations and want the document areas mapped out.",
      "You want to cite a described method rather than an unsourced claim about application paperwork.",
      "You are deciding how much to trust ApprovalPrep's guidance and want to inspect its basis."
    ],
    "prepBrief": [
      "Decide which application category you are actually preparing for.",
      "Read the method section before the findings.",
      "Note which findings apply to your situation and which do not.",
      "Check the stated limitations against the decision you are about to make."
    ],
    "commonMistakes": [
      "Treating a described pattern as a rule that every reviewer follows.",
      "Quoting a finding without the limitation published next to it.",
      "Using a report as a substitute for the specific instructions a reviewer gave you.",
      "Assuming a report about document preparation says anything about approval odds."
    ],
    "reviewChecklist": [
      "You read the method before relying on the finding.",
      "The finding you are using actually covers your situation.",
      "You carried the stated limitation along with anything you quote.",
      "You still followed the specific instructions your own reviewer gave you."
    ],
    "steps": [
      "Choose the report that covers your application category.",
      "Read its method and its stated limitations.",
      "Note the document-prep areas that apply to you.",
      "Move to the checklist or template for your specific situation.",
      "Gather your own documents and send them yourself."
    ],
    "trustSignals": ["Method published", "Sources named", "Limitations stated", "No approval claims"],
    "faq": [
      { "question": "Are these reports independent research?", "answer": "They are ApprovalPrep's own reports. Each one publishes the method it used and the public sources it was built from, so a reader can check the basis rather than take the finding on trust." },
      { "question": "Can a report tell me whether I will be approved?", "answer": "No. The reports describe what applicants are commonly asked to produce. They say nothing about approval odds, and ApprovalPrep does not promise any application outcome." },
      { "question": "Which should I read first, a report or a checklist?", "answer": "Read a report when you want the reasoning across a whole category. Go straight to a checklist when you already know your situation and want the list of what to gather." }
    ]
  },
  "/resources": {
    "heading": "Resources",
    "lead": "Find ApprovalPrep guides, short answers, the glossary, prices and every policy page in one place.",
    "shortAnswer": "Everything to read before you write or buy is linked from this page: the free Letter Studio, the short answers, how the kits are made, the glossary, prices, and the privacy and refund policies.",
    "primaryCta": "Read the short answers",
    "secondaryCta": "Draft free in the Letter Studio",
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
    "lead": "Short answers to common questions about explanation letters, credit letters, rental packets and income proof, each with the guide or kit that goes with it.",
    "shortAnswer": "Short, plain answers to common paperwork questions. Each one links to the guide or kit that goes with it. To start a letter now, open the free Letter Studio.",
    "primaryCta": "Draft free in the Letter Studio",
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
    "primaryCta": "Draft free in the Letter Studio",
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
    "metaTitle": `ApprovalPrep Pricing: Compare ${kitCountWord} Kits and the Complete Bundle`,
    "lead": `Compare all ${kitCountWord.toLowerCase()} ApprovalPrep kits and the Complete Bundle side by side: what each one covers, which situations it fits, and when the free Studio or a free checklist is enough.`,
    "shortAnswer": `${kitCountWord} kits and one bundle, each a one-time purchase with no subscription: pick the one that matches the paperwork in front of you, or the bundle if you are facing several at once. Compare kits by the document you actually have to produce this month, not by item count; every kit downloads as both a PDF guide and an editable DOCX.`,
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Draft free in the Letter Studio",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Is any kit a subscription?", "answer": "No. Each kit is a one-time payment for a PDF guide and an editable DOCX. Nothing renews, and ApprovalPrep does not charge you again." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation": {
    "heading": "Write a clear letter of explanation.",
    "studioSituation": "general",
    "lead": "Write one clear letter of explanation for a credit, income, job gap, address, or deposit question, with the facts and proof a reviewer needs to close it.",
    "shortAnswer": "A letter of explanation is a short, factual account of one event in your financial history, written for a reviewer who has asked you to account for it. Name the event, give its dates, say what changed and what is true now, and attach only the documents that support those specific statements.",
    "primaryCta": "Create my letter",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Will a lender accept any letter of explanation I write?", "answer": "No letter guarantees acceptance. The underwriter decides, and ApprovalPrep does not contact your lender. The kit helps you answer the exact item they asked about, with proof attached." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/credit": {
    "heading": "Credit Letter of Explanation",
    "lead": "Explain a late payment, collection, or other credit item to a lender or landlord in a few factual sentences, backed by dates and documents you can show.",
    "shortAnswer": "A credit explanation letter accounts for a specific entry on your credit report: what happened, when, and where the account stands today. Pull the report first and quote the entry exactly as it appears, including the creditor name and the date, so the reviewer can match your letter to the line.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "An underwriter asked you to explain a late payment, collection, charge-off or new inquiry on your credit report.",
      "You have a credit item with a real cause (job loss, medical bills, a billing error) that has since been resolved or is being paid.",
      "You are applying for a mortgage or apartment and expect the score or report to raise a question."
    ],
    "prepBrief": [
      "A current copy of the credit report with the exact item circled: creditor, account ending, date and amount.",
      "Proof of the cause: a termination letter, hospital bill, divorce decree or dispute confirmation.",
      "Proof it is handled now: a payoff letter, a payment plan, or twelve months of on-time statements.",
      "The lender's written request, so you answer only the item they named."
    ],
    "reviewChecklist": [
      "Each credit item you mention matches the report exactly: creditor name, dates and balance.",
      "You state what caused it, what you did about it, and why it is unlikely to happen again, in that order.",
      "Nothing in the letter blames the creditor or disputes the item unless you have filed a dispute."
    ],
    "commonMistakes": [
      "Explaining items the lender did not ask about, which invites more questions.",
      "Calling an item an error in an explanation letter instead of disputing it with the bureau.",
      "Promising future behaviour with no proof of a change already made."
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
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/eviction": {
    "heading": "Eviction Letter of Explanation",
    "lead": "Explain a past eviction or rental dispute to a new landlord with a short, factual timeline, what has changed since, and the records behind each statement.",
    "shortAnswer": "An eviction explanation letter tells a prospective landlord what happened, how it was resolved, and what your housing record has looked like since. Have the case outcome, any settlement or payment record, and references from the tenancies that followed ready to attach.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "A landlord or property manager found an eviction filing or judgment on a tenant screening report.",
      "Your eviction case was dismissed, settled or paid, and the record still shows up.",
      "You were evicted because of a one-time event (a job loss, a medical crisis, a landlord sale) and have rented without trouble since."
    ],
    "prepBrief": [
      "The court case number, filing date and the outcome: dismissed, settled, judgment paid, or sealed.",
      "Proof of payment or a satisfaction of judgment if money was owed.",
      "Rent receipts, a ledger or a reference from every landlord since the eviction.",
      "Current proof of income showing the new rent fits, such as recent pay stubs or an offer letter."
    ],
    "reviewChecklist": [
      "The case outcome you state matches the court record word for word.",
      "The letter says what happened, what has changed, and what proof is attached, in under one page.",
      "You named a reference the landlord can actually reach, with their permission."
    ],
    "commonMistakes": [
      "Leaving the eviction out and hoping the screening misses it; most tenant screening reports include court filings.",
      "Writing a long account of the dispute with the old landlord instead of what has changed since.",
      "Offering a larger deposit or prepaid rent you cannot afford, or that local law does not allow."
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
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/income": {
    "heading": "Income Letter of Explanation",
    "lead": "Explain unusual deposits or an irregular income to a lender or landlord: where the money came from, when, and which statements or pay records show it.",
    "shortAnswer": "An income explanation letter accounts for deposits, gaps or swings in your income that your statements show but do not explain. Tie each unusual deposit to its source and have the paperwork behind it: a sale, a gift, a reimbursement, a bonus, a transfer between your own accounts.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "A lender or landlord asked why your income changed, dropped, or does not match last year's tax return.",
      "You are paid by commission, bonus, tips or overtime and your monthly income moves around.",
      "You recently changed jobs, went part-time, or returned to work and the pay history looks uneven."
    ],
    "prepBrief": [
      "The two most recent years of W-2s or tax returns and your latest pay stubs.",
      "A written offer or employer letter for any new pay rate, schedule or position.",
      "For variable pay, a year-to-date total and how bonus or commission is calculated.",
      "The date the change started and whether it is permanent or temporary."
    ],
    "reviewChecklist": [
      "Every income figure matches a document you are attaching.",
      "You say plainly whether the change is permanent, and when the new figure started.",
      "Temporary income (unemployment, a one-time bonus) is not presented as ongoing pay."
    ],
    "commonMistakes": [
      "Rounding income up or averaging in a year that does not reflect current pay.",
      "Explaining a drop without saying what the income is now.",
      "Attaching bank deposits instead of the pay records the request asked for."
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
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/letter-of-explanation/employment-gap": {
    "heading": "Employment Gap Letter of Explanation",
    "lead": "Explain a gap in employment with the dates, the reason in one plain sentence, and what you did during it, so a lender or landlord can close the question.",
    "shortAnswer": "An employment gap letter sets out when you were out of work, why, and what your current role and income are. Fix the start and end dates of the gap against your own records before you write, and say plainly what you were doing during it.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "A mortgage underwriter asked about a gap in your work history, often any gap longer than a month or two.",
      "You took time off for caregiving, illness, school, a move or a layoff and are back at work now.",
      "An employer's background check or a landlord's income check shows dates that do not line up."
    ],
    "prepBrief": [
      "Exact start and end dates for the job before and after the gap.",
      "Proof of the reason where it exists: a school transcript, a layoff notice, a medical note that names no diagnosis.",
      "Your current offer letter or recent pay stubs showing you are working now.",
      "How you paid bills during the gap, if the lender asks: savings, a spouse's income, unemployment benefits."
    ],
    "reviewChecklist": [
      "The dates in the letter match your application and your W-2s.",
      "The reason takes one or two sentences, and the letter spends more words on your current job.",
      "No private medical detail is included beyond what is needed to explain the dates."
    ],
    "commonMistakes": [
      "Over-sharing medical or family details the lender does not need.",
      "Leaving the current job out, when that is what the underwriter cares about most.",
      "Giving different dates in the letter and on the loan application."
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
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/employment-verification-letter": {
    "heading": "Employment Verification Letter",
    "lead": "Employment Verification Letter helps you prepare for employment verification with truthful details, organized supporting documents, and a clear next step before truthful work details becomes urgent.",
    "shortAnswer": "An employment verification letter is written by your employer to confirm your role, start date and pay to whoever has asked for it. Send your employer or HR team a draft with the details already filled in, and name who it should be addressed to and by when.",
    "primaryCta": "Get the income kit",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "A landlord, lender or agency asked you for a letter from your employer confirming your job.",
      "You are the employer or HR contact and need a plain format to confirm an employee's role and pay.",
      "You need the letter quickly and your HR team has no template."
    ],
    "prepBrief": [
      "The employee's legal name, job title, start date and employment status (full-time, part-time, contract).",
      "Pay rate or salary, only if the employee has authorised sharing it.",
      "The name, title and contact details of the person signing for the company.",
      "Who the letter is addressed to and what exactly they asked to have confirmed."
    ],
    "reviewChecklist": [
      "It is on company letterhead or from a company email, and signed by someone with authority to confirm employment.",
      "It confirms only facts the company records show; no promises about future employment.",
      "The employee has agreed to any salary figure being included."
    ],
    "commonMistakes": [
      "The employee writing and signing the letter themselves; verifiers call the employer to check.",
      "Including salary without the employee's consent.",
      "Leaving off a phone number or email the verifier can use to confirm the letter."
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
      { "question": "Can I write my own employment verification letter?", "answer": "No. It has to come from your employer, and verifiers usually call the company to confirm it. ApprovalPrep gives the employer a format; it does not verify employment for anyone." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/proof-of-income-letter": {
    "heading": "Proof of Income Letter",
    "lead": "Prepare a proof of income letter that states who pays you, how much, and how often, with pay stubs, statements, or 1099s that match every number in it.",
    "shortAnswer": "A proof of income letter states what you earn, from which sources, and how often, in a form a reviewer can read at a glance. Make the figure in the letter match the figure your stubs, statements or return actually show, and list each source separately.",
    "primaryCta": "Get the income kit",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Is a proof of income letter enough on its own?", "answer": "Usually not. Most landlords and lenders also want pay stubs, tax returns or bank statements behind it. ApprovalPrep does not create or certify income records." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/credit-dispute-letter": {
    "heading": "Credit Dispute Letter Generator",
    "studioSituation": "credit-dispute",
    "lead": "Draft your own credit report dispute letter naming the exact item, why it is inaccurate, and the proof you attach. You send it to the bureau yourself.",
    "shortAnswer": "A credit dispute letter asks a bureau to investigate a specific entry you believe is inaccurate, and asks for the result in writing. Identify the account, say exactly what is wrong with it, and keep a dated copy of what you sent and how you sent it.",
    "primaryCta": "Get the credit letter kit",
    "secondaryCta": "Compare kits",
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
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/apartment-application": {
    "heading": "Apartment Application: Rental Application Kit",
    "lead": "Get an apartment application ready before you tour: ID, income proof, rental history, references, and a short cover letter, gathered into one packet.",
    "shortAnswer": "A rental application packet is the set of documents a leasing office asks for, assembled once so you can submit it the same day you view a place. Scan each item to a clearly named file and keep one folder you can send whole, so nothing is missing at the counter.",
    "primaryCta": "Get the rental kit",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Can ApprovalPrep get me approved for an apartment?", "answer": "No. The landlord decides using their own screening criteria. ApprovalPrep helps you send a complete application; it does not contact landlords or screening companies." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/rental-application-checklist": {
    "heading": "Rental Application Checklist",
    "lead": "A rental application checklist of what landlords usually ask for, from ID and pay stubs to bank statements and references, so nothing stalls your file.",
    "shortAnswer": "This checklist is what to have in hand before you tour: identification, income, rental history, references and the fee. Work through it before the first viewing, not after an offer, because competitive units go to whoever can file completely first.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You are about to apply for an apartment and want every document ready before you tour.",
      "You are competing for units that go fast and want to submit the same day.",
      "You are applying with a roommate or co-signer and need everyone's papers in one place."
    ],
    "prepBrief": [
      "A government photo ID for every adult applicant.",
      "Proof of income: recent pay stubs, an offer letter, or benefit award letters.",
      "Contact details for your current and previous landlords.",
      "Your own copy of your credit report so nothing in the screening surprises you."
    ],
    "reviewChecklist": [
      "Every adult on the lease has their own ID and income proof in the folder.",
      "Your landlord references know they may be contacted.",
      "You know the application fee and what it covers before you pay it."
    ],
    "commonMistakes": [
      "Touring first and gathering documents after, then losing the unit to a ready applicant.",
      "Paying application fees on several units at once without checking the screening criteria.",
      "Forgetting the co-signer's documents, which can delay approval by days."
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
      { "question": "Do I have to bring every item on this checklist?", "answer": "No. Bring what your landlord's application asks for. The checklist covers what is commonly requested so you are not caught short; it does not replace the landlord's own list." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/how-to-get-approved-for-an-apartment": {
    "heading": "Applying for an Apartment: What to Prepare",
    "lead": "What landlords check on a rental application, income, rental history, credit, and references, and how to prepare each one honestly before you apply.",
    "shortAnswer": "Approval usually turns on three things a screener can verify: income against the rent, rental history, and what a credit and background check shows. Find out the office's income and score thresholds before applying, and prepare an explanation for anything a screening report will surface.",
    "primaryCta": "Build my packet",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You have been turned down for an apartment and want to know what to change before the next application.",
      "Your credit, income or rental history is thin or has a mark on it.",
      "You are a first-time renter with no landlord history."
    ],
    "prepBrief": [
      "The landlord's written screening criteria: income multiple, minimum credit score and history rules.",
      "Proof your income meets the multiple, or a co-signer or guarantor who does.",
      "A short explanation letter for any eviction, collection or gap the screening will show.",
      "References from people who can speak to how you pay and live: a past landlord, employer or roommate."
    ],
    "reviewChecklist": [
      "You meet the published criteria, or you have a guarantor, extra deposit or explanation ready for the one you miss.",
      "Your explanation letter answers the specific mark on your report, not your whole history.",
      "The application has no blank required fields."
    ],
    "commonMistakes": [
      "Applying without reading the criteria, then paying a fee for a denial you could predict.",
      "Hiding a known issue instead of addressing it in the application.",
      "Using a guarantor who does not meet the landlord's guarantor requirements."
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
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/auto-loan-documents": {
    "heading": "Auto Loan Documents",
    "lead": "The documents a dealer finance desk or auto lender usually asks for: ID, proof of income, proof of residence, insurance, and your trade-in paperwork.",
    "shortAnswer": "A dealer's finance desk will ask for identification, proof of income, proof of insurance and proof of address before it writes a contract. Bring originals or clear photographs of each, and know your trade-in's payoff figure before you sit down.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You are financing a car through a dealer or bank and they asked for your paperwork.",
      "You want to arrive at the dealership with your loan file ready instead of waiting on approval.",
      "You are refinancing an existing auto loan."
    ],
    "prepBrief": [
      "A valid driver's license.",
      "Proof of income: recent pay stubs, or tax returns if self-employed.",
      "Proof of residence: a utility bill or lease in your name at your current address.",
      "Proof of insurance, or the details of the policy you will put on the car."
    ],
    "reviewChecklist": [
      "The address on your license, bill and application match, or you have proof of the new one.",
      "You know the loan's APR, term and total cost, not only the monthly payment.",
      "For a trade-in, you have the title or payoff letter."
    ],
    "commonMistakes": [
      "Negotiating only the monthly payment while the loan term stretches the total cost.",
      "Bringing an old utility bill that no longer matches your current address.",
      "Forgetting the trade-in title or payoff amount, which stalls the deal."
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
      { "question": "Does ApprovalPrep arrange car financing?", "answer": "No. ApprovalPrep is not a lender or a broker. This page lists the documents lenders commonly ask for so you can apply with your file ready." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/car-loan-checklist": {
    "heading": "Car Loan Checklist",
    "lead": "A car loan checklist to work through before preapproval: identity, income, residence, insurance, and down payment records, gathered before the dealer asks.",
    "shortAnswer": "This checklist is what a lender wants to see before giving a preapproval you can take to a dealership. Get the preapproval before you shop, so you are negotiating the vehicle price rather than a monthly payment.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You want a single checklist to tick off before you apply for a car loan.",
      "You are buying from a private seller and need to arrange financing yourself.",
      "You are a first-time buyer and do not know what lenders ask for."
    ],
    "prepBrief": [
      "Your credit report and score, checked before a lender pulls them.",
      "A pre-approval quote from a bank or credit union to compare with dealer financing.",
      "Your down payment in an account you can show a statement for.",
      "For a private sale, the seller's title and a bill of sale."
    ],
    "reviewChecklist": [
      "You compared at least one outside quote with the dealer's offer.",
      "Your down payment and monthly payment fit your budget with insurance included.",
      "Every box on the checklist has a document behind it, not a promise to bring it later."
    ],
    "commonMistakes": [
      "Shopping for the car before knowing what you are approved to borrow.",
      "Letting several lenders pull credit over many weeks instead of in one short window.",
      "Skipping the outside quote and accepting the first financing offer."
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
      { "question": "Does checking my credit before applying lower my score?", "answer": "No. Checking your own credit report is a soft inquiry and does not affect your score. A lender's application usually is a hard inquiry." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/documents-needed-for-car-loan": {
    "heading": "Documents Needed for a Car Loan",
    "lead": "Which documents you need for a car loan, why a lender asks for each one, and what to bring if your income is irregular or you have recently moved.",
    "shortAnswer": "The document list for a car loan is short: who you are, what you earn, where you live, and how the vehicle will be insured. Have a recent pay stub, your license, an insurance declaration page and a utility bill in one place before you apply.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "A lender gave you a list of stipulations (proof of income, residence, references) and you need to clear them.",
      "You are self-employed or paid in cash and need other ways to show income.",
      "You are buying with a co-borrower and both of you need documents."
    ],
    "prepBrief": [
      "The lender's exact stipulation list, so you answer each item.",
      "For self-employment: the last two years of tax returns and recent bank statements.",
      "Personal references with names and phone numbers, if the lender asks for them.",
      "The co-borrower's ID and income proof, gathered the same way as yours."
    ],
    "reviewChecklist": [
      "Every stipulation on the lender's list has a matching document.",
      "Bank statements show every page, including blank ones, as lenders usually require.",
      "References have agreed to take a call."
    ],
    "commonMistakes": [
      "Sending documents one at a time, which restarts the review each time.",
      "Cropping or editing bank statements, which lenders treat as altered documents.",
      "Listing references who have not agreed to be contacted."
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
      { "question": "Can I send edited or cropped bank statements?", "answer": "No. Lenders treat edited statements as altered documents. Send every page as your bank issued it. ApprovalPrep does not alter or create financial documents." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/sba-loan-checklist": {
    "heading": "SBA Loan Checklist",
    "lead": "An SBA loan checklist for small business owners: tax returns, financial statements, a debt schedule, ownership records, and a use of funds explanation.",
    "shortAnswer": "An SBA application asks for more paperwork than a conventional loan: business formation documents, financial statements, tax returns and a written use of funds. Assemble it as one indexed package, because lenders process complete files first and partial ones sit.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You are applying for an SBA 7(a) or 504 loan through a bank or credit union.",
      "Your lender sent an SBA document list and you want to work through it in order.",
      "You are buying a business or real estate with SBA financing."
    ],
    "prepBrief": [
      "SBA Form 1919 (borrower information) and a personal financial statement for each owner of 20% or more.",
      "Business and personal tax returns, usually for the last three years.",
      "Year-to-date profit and loss statement and balance sheet.",
      "A business plan or use-of-funds summary, with projections for a new business."
    ],
    "reviewChecklist": [
      "Every owner of 20% or more has signed their own forms and financial statement.",
      "The figures on the tax returns, financial statements and application agree with each other.",
      "Your use-of-funds summary adds up to the loan amount you are requesting."
    ],
    "commonMistakes": [
      "Leaving out an owner who crosses the 20% line, which stops the file.",
      "Submitting financial statements that do not reconcile with the tax returns.",
      "Using an old version of an SBA form; check sba.gov for the current one."
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
      { "question": "Is ApprovalPrep affiliated with the SBA?", "answer": "No. ApprovalPrep is not affiliated with the U.S. Small Business Administration or any lender, and does not submit applications. Current SBA forms are on sba.gov." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/business-loan-documents": {
    "heading": "Business Loan Documents",
    "lead": "The business loan documents lenders usually review, bank statements, tax returns, formation papers, and cash flow, and how to organize them first.",
    "shortAnswer": "A business lender reviews your formation documents, bank statements, tax returns and current financials before it looks at the request itself. Have a profit and loss statement and balance sheet current through last month, and a short written note on what the money is for.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You are applying for a bank loan, line of credit or equipment financing for your business.",
      "A lender asked for a document package and you want it complete on the first submission.",
      "Your business is young and you need to show the lender it can repay."
    ],
    "prepBrief": [
      "Business formation documents: articles of organisation or incorporation, and your EIN letter.",
      "Business bank statements, usually for the last several months.",
      "Business and personal tax returns, and current financial statements.",
      "Any existing debts: loan statements, leases and their monthly payments."
    ],
    "reviewChecklist": [
      "The legal business name matches on every document.",
      "Your debt schedule includes every current loan and lease payment.",
      "Personal guarantee terms are read and understood before you sign."
    ],
    "commonMistakes": [
      "Mixing personal and business accounts, which makes cash flow hard for a lender to read.",
      "Leaving an existing loan off the debt schedule, which the lender will find anyway.",
      "Applying with formation documents that list old owners or an old address."
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
      { "question": "Does ApprovalPrep review my business financials?", "answer": "No. ApprovalPrep does not review, prepare or certify financial statements. Use an accountant for that. This page helps you organise what a lender asks for." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/mortgage-checklist": {
    "heading": "Mortgage Checklist",
    "lead": "A mortgage checklist for underwriting: income, assets, debts, identity, and the explanation letters underwriters often request, ready before they ask.",
    "shortAnswer": "Mortgage underwriting works from documents, not conversations: income, assets, debts and identity, each evidenced on paper. Gather two years of returns and W-2s, 30 days of pay stubs and two months of statements for every account in play.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You are getting pre-approved for a mortgage and want your file complete before you make an offer.",
      "You are buying your first home and want to know what each document is for.",
      "You are refinancing and the lender asked for a fresh document set."
    ],
    "prepBrief": [
      "Two years of W-2s or tax returns, and pay stubs covering the last 30 days.",
      "Two months of statements for every bank and investment account, all pages.",
      "A gift letter and the donor's proof of funds, if family is helping with the down payment.",
      "Explanation letters ready for any large deposit, credit item or job gap."
    ],
    "reviewChecklist": [
      "Large deposits on your statements are traced to their source with paperwork.",
      "You have not opened new credit or changed jobs since pre-approval without telling your lender.",
      "All account statements are complete and not edited."
    ],
    "commonMistakes": [
      "Moving money between accounts during the loan process without a paper trail.",
      "Opening a new credit card or financing furniture before closing.",
      "Sending screenshots instead of full statements."
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
      { "question": "Can I move money between accounts during the mortgage process?", "answer": "You can, but every transfer needs a paper trail, and the underwriter will ask about it. ApprovalPrep does not give lending advice, so ask your loan officer before large moves." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/mortgage-document-checklist": {
    "heading": "Mortgage Document Checklist",
    "lead": "The documents a mortgage loan file typically needs, from pay stubs and W-2s to bank statements and gift letters, grouped the way underwriters review them.",
    "shortAnswer": "This is the document list a loan file needs before an underwriter can clear it, item by item. Name every scan clearly and keep a copy of what you sent and on which date, because conditions often ask for the same item twice.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "Your loan is in underwriting and the lender sent a list of conditions to clear.",
      "You received a request for documents you have not heard of, such as a verification of rent.",
      "You want to know which documents the underwriter asks for at each stage."
    ],
    "prepBrief": [
      "The underwriter's conditions list, with a due date for each item.",
      "Verification of rent or twelve months of rent payments, if asked.",
      "Homeowner's insurance quote or binder for the property.",
      "Updated pay stubs and bank statements if the originals are now more than 30 to 60 days old."
    ],
    "reviewChecklist": [
      "Each condition on the list has a matching document, labelled with the condition it clears.",
      "Updated documents replace the old ones rather than repeat them.",
      "Signatures and dates are on every form that asks for them."
    ],
    "commonMistakes": [
      "Clearing conditions in pieces, which delays the closing date.",
      "Sending outdated statements that the underwriter will ask for again.",
      "Assuming a condition does not apply instead of answering it."
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
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/important-documents-checklist": {
    "heading": "Important Documents Checklist",
    "lead": "Which important documents to keep in one folder, identity, insurance, property, tax, and medical records, and how to find each one fast when asked.",
    "shortAnswer": "An important documents folder holds the records you will be asked for at short notice: identity, property, insurance and legal directives. Keep originals in one secure place, a scanned copy somewhere separate, and a single note of where each lives.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You want one organised place for the papers you need for every application.",
      "You have had to hunt for a birth certificate or tax return in a hurry.",
      "You are helping a parent or partner get their records in order."
    ],
    "prepBrief": [
      "Identity: birth certificate, Social Security card, passport and driver's license.",
      "Money: recent tax returns, pay stubs, bank and retirement account statements.",
      "Home and car: lease or deed, titles, and insurance policies.",
      "Health and legal: insurance cards, a will, powers of attorney and medical directives."
    ],
    "reviewChecklist": [
      "Originals are stored securely and you work from copies.",
      "Every document has an expiry date noted where one applies (ID, passport, insurance).",
      "Someone you trust knows where the folder is."
    ],
    "commonMistakes": [
      "Keeping originals and copies in the same place.",
      "Letting an ID or passport expire just before you need it.",
      "Storing scans in an unencrypted shared folder."
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
      { "question": "Should I upload my documents to ApprovalPrep?", "answer": "No. ApprovalPrep does not store or ask for your documents. The checklist helps you organise originals and copies you keep yourself." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/moving-checklist": {
    "heading": "Moving Checklist",
    "lead": "A moving checklist for the paperwork side of a move: address changes, utility and account transfers, lease records, and proof of your new residence.",
    "shortAnswer": "A move means changing your address on records that matter and transferring the accounts attached to the property. Work through identity records, utilities, insurance, banking and anything licensed, and set mail forwarding before the last day.",
    "primaryCta": "Get the checklist",
    "secondaryCta": "Compare kits",
    "whoFor": [
      "You are moving and need your paperwork in order for a new lease, utilities and address changes.",
      "You are moving to a new state and need to update your license, registration and voter registration.",
      "You want your deposit back from the place you are leaving."
    ],
    "prepBrief": [
      "Your current lease, with its notice period and move-out terms.",
      "Move-in photos from the place you are leaving, to compare at move-out.",
      "A list of accounts that need your new address: bank, employer, insurance, USPS forwarding.",
      "The new lease and the utility accounts to open in your name."
    ],
    "reviewChecklist": [
      "Your notice to the current landlord is in writing and within the lease's notice period.",
      "You have dated move-out photos and a forwarding address for the deposit.",
      "Your new address is updated with the post office, your employer and your bank."
    ],
    "commonMistakes": [
      "Giving notice by text when the lease requires writing.",
      "Leaving without photos, then having no proof against deposit deductions.",
      "Forgetting to update the address on your license within your new state's deadline."
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
      { "question": "Does ApprovalPrep handle address changes for me?", "answer": "No. You file your USPS forwarding and update your bank, employer and license yourself. The checklist helps you remember each one; ApprovalPrep does not contact anyone for you." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/glossary": {
    "heading": "ApprovalPrep Glossary",
    "lead": "Plain-language definitions of the terms that come up in applications and underwriting, from letter of explanation to proof of income and verification.",
    "shortAnswer": "These are the terms reviewers, lenders and leasing offices use, written out in plain language. Look a term up when it appears in a request, so you answer what was actually asked rather than what it sounded like.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Are these definitions legal advice?", "answer": "No. They are plain-language definitions of terms used on ApprovalPrep. They do not replace advice from a lawyer, lender or tax professional." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/methodology": {
    "heading": "ApprovalPrep Methodology",
    "lead": "ApprovalPrep Methodology helps you prepare for ApprovalPrep method with truthful details, organized supporting documents, and a clear next step before truthful document preparation becomes urgent.",
    "shortAnswer": "ApprovalPrep works from one rule: organize true facts and your own documents, and send them yourself. Every kit follows the same order, which is clarify the request, gather proof, draft, check, and keep a copy.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Does ApprovalPrep use AI to write my letter?", "answer": "No. The Studio and kits use fixed templates and your own facts. ApprovalPrep does not generate letters with an AI model or store what you type." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/checkout/success": {
    "heading": "Checkout Success",
    "lead": "Checkout Success helps you prepare for payment confirmation with truthful details, organized supporting documents, and a clear next step before protected delivery becomes urgent.",
    "shortAnswer": "Your payment has gone through and your files are ready on this page. Download both the PDF guide and the editable DOCX now, and save them somewhere you will find them again.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": true
  },
  "/download": {
    "heading": "Download",
    "lead": "Download helps you prepare for verified download with truthful details, organized supporting documents, and a clear next step before private file access becomes urgent.",
    "shortAnswer": "This is where a verified purchase collects its files. Use the same email address you bought with, and the page will show what your purchase includes.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": true
  },
  "/privacy": {
    "heading": "Privacy Policy",
    "metaTitle": "Privacy Policy: How ApprovalPrep Handles Your Data",
    "lead": "How ApprovalPrep handles your data: what is processed to run checkout and downloads, and why your letter answers, drafts, and uploads are never stored.",
    "shortAnswer": "This page explains the privacy policy boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/terms": {
    "heading": "Terms of Use",
    "metaTitle": "Terms of Use for ApprovalPrep Self-Service Tools",
    "lead": "The terms for using ApprovalPrep: a self-service document prep site where you supply truthful facts, review your own materials, and send them yourself.",
    "shortAnswer": "This page explains the terms of use boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/disclaimer": {
    "heading": "Disclaimer",
    "metaTitle": "Disclaimer: ApprovalPrep Is Not Legal or Financial Advice",
    "lead": "ApprovalPrep offers templates and general guidance, not legal, financial, tax, or credit repair advice. What that means for the letters you prepare.",
    "shortAnswer": "This page explains the disclaimer boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
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
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/refund-policy": {
    "heading": "Refund Policy",
    "metaTitle": "Refund Policy for ApprovalPrep Digital Kit Downloads",
    "lead": "When ApprovalPrep refunds a digital kit: duplicate purchases, failed access, incorrect charges, or delivery problems, and how to send your order details.",
    "shortAnswer": "This page explains the refund policy boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/security": {
    "heading": "Security",
    "metaTitle": "Security: How ApprovalPrep Protects Checkout and Downloads",
    "lead": "How ApprovalPrep protects checkout and paid downloads, keeps data collection minimal, and never stores your letter answers, drafts, or uploaded files.",
    "shortAnswer": "This page explains the security posture boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/accessibility": {
    "heading": "Accessibility",
    "metaTitle": "Accessibility Statement for ApprovalPrep",
    "lead": "ApprovalPrep's accessibility commitment: plain language, keyboard-friendly controls, readable contrast, responsive layouts, and how to report a barrier.",
    "shortAnswer": "This page explains the accessibility boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/contact": {
    "heading": "Contact",
    "lead": "Contact helps you prepare for contact options with truthful details, organized supporting documents, and a clear next step before support boundaries becomes urgent.",
    "shortAnswer": "This page explains the contact options boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Can I send you my documents for review?", "answer": "No. ApprovalPrep does not review personal documents or act on your behalf. Write for help with a purchase, a download or a correction to a page." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/about": {
    "heading": "About ApprovalPrep",
    "lead": "Who publishes ApprovalPrep, what the kits do, what they never do, and how to reach a person about a purchase or download.",
    "shortAnswer": "ApprovalPrep is published by ApprovalPrep Editorial, a subsidiary of Spry Labs. It sells self-service letter and checklist kits from $15 to $49 and offers free browser-only drafts. It is not a law firm, a lender, or a credit repair organization, and nothing on the site is legal or credit advice.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "decisionContext": [
      "People reach this page when they are about to trust a site with a paperwork problem that matters: a rental application, a loan file, a credit report error, or an employer request. Before buying anything, it is reasonable to ask who is behind the site and what it will and will not do.",
      "ApprovalPrep answers that plainly. It is a publication with a named editorial owner, a published method, a contact address that a person reads, and a boundary that does not move: you prepare and send your own documents, and no one here acts for you."
    ],
    "whoFor": [
      "Renters, borrowers, and job applicants deciding whether to use a self-service kit.",
      "People who want to know who wrote a guide before they rely on it.",
      "Buyers checking how to get help with a purchase or a download that did not unlock.",
      "Reviewers, journalists, and partners who need a clear statement of what ApprovalPrep is."
    ],
    "value": [
      "A named publisher, ApprovalPrep Editorial, a subsidiary of Spry Labs, on every guide and in the page data.",
      "Kit prices stated up front, paid once, with no subscription.",
      "Free browser-only drafts that save nothing you type.",
      "Guides checked against the primary sources linked on each page, and corrected when those sources change.",
      "A boundary stated the same way everywhere: no legal advice, no credit repair, no third-party contact, no fake documents, no approval guarantee."
    ],
    "whatYouGet": [
      "Editable DOCX and PDF letters, checklists, and next-step guides in each paid kit.",
      "Free letter drafts in the browser before you pay anything.",
      "Plain-language guides that answer the question a landlord, lender, or bureau actually asked.",
      "Email support at info@approvalprep.com for purchases and downloads."
    ],
    "useCases": [
      "You want to confirm a real organization stands behind the guide you are reading.",
      "You bought a kit and the download link did not arrive or did not open.",
      "You want to report an error in a guide so it can be corrected.",
      "You need to know whether ApprovalPrep can contact a bureau or landlord for you. It cannot."
    ],
    "prepBrief": [
      "For a purchase or download problem, have your receipt email and the kit name ready.",
      "For a correction, include the page address and the source that shows the right information.",
      "For advice about your own legal or credit situation, contact a licensed attorney, a HUD-approved housing counselor, or a nonprofit credit counselor instead."
    ],
    "commonMistakes": [
      "Expecting ApprovalPrep to send letters, call a landlord, or dispute an item on your behalf. You send everything yourself.",
      "Treating a guide as legal or credit advice. It is general information to help you prepare.",
      "Paying a credit repair company for letters you can write and send yourself for free under the Fair Credit Reporting Act."
    ],
    "reviewChecklist": [
      "Read the guide's primary sources before relying on a deadline or a rule.",
      "Check that every fact in your letter is true and that you can prove it.",
      "Keep copies of everything you send and the date you sent it.",
      "Email info@approvalprep.com if a kit file is missing or will not open."
    ],
    "steps": [
      "Read the free guide for your situation.",
      "Draft a free letter in the browser if you want to start without paying.",
      "Buy the matching kit if you want the editable DOCX and PDF set.",
      "Review everything, then send it yourself."
    ],
    "faq": [
      {
        "question": "Who publishes ApprovalPrep?",
        "answer": "ApprovalPrep Editorial, a subsidiary of Spry Labs, writes and maintains the site, its guides, and its kits."
      },
      {
        "question": "Is ApprovalPrep a credit repair company or a law firm?",
        "answer": "No. ApprovalPrep is a self-service document-prep publication. It does not give legal or credit advice, does not contact anyone for you, and cannot promise an approval."
      },
      {
        "question": "How do I get help with a purchase or download?",
        "answer": "Email info@approvalprep.com with your receipt email and the kit name. Downloads are tied to your Stripe receipt."
      },
      {
        "question": "How much do the kits cost?",
        "answer": "Single kits cost $15 to $39, and the complete set of all seven kits costs $49. You pay once; there is no subscription."
      }
    ],
    "trustSignals": [
      "Named publisher",
      "Paid once",
      "No account required",
      "No stored letter answers",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/editorial-policy": {
    "heading": "Editorial Policy",
    "lead": "How ApprovalPrep writes and reviews its guides: plain and truthful, no overstated outcomes, extra review on credit, legal, and lending topics.",
    "shortAnswer": "This page explains the editorial standards boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Do ApprovalPrep guides promise an outcome?", "answer": "No. The editorial rule is that no guide promises an approval, a score change or a deleted record, because ApprovalPrep does not control those decisions." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/ai-use-policy": {
    "heading": "AI Use Policy",
    "metaTitle": "AI Use Policy: Where ApprovalPrep Uses AI and Where It Does Not",
    "lead": "Where ApprovalPrep uses software-assisted drafting and checks, why the free Letter Writing Studio needs no AI calls, and why you review every letter.",
    "shortAnswer": "This page explains the AI use policy boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/credit-repair-disclaimer": {
    "heading": "Credit Repair Disclaimer",
    "lead": "ApprovalPrep sells do-it-yourself credit letters, not credit repair. You write and send each letter; nobody disputes items or contacts bureaus for you.",
    "shortAnswer": "This page explains the credit repair disclaimer boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
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
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/not-a-credit-repair-company": {
    "heading": "Not a Credit Repair Company",
    "lead": "ApprovalPrep is not a credit repair company. It never contacts credit bureaus or creditors for you; it sells letter kits you prepare and send yourself.",
    "shortAnswer": "This page explains the not a credit repair company boundary in plain English. ApprovalPrep is a self-service document-prep site: it provides templates, checklists, and guidance, but you remain responsible for what you write, review, download, and send.",
    "primaryCta": "See the kits and prices",
    "secondaryCta": "Compare kits",
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
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/income-employment-letter-kit": {
    "heading": "Income + Employment Letter Kit",
    "lead": "Letters for proving work and income: employment verification, proof of income, self-employment income, job change, and employment gap explanations.",
    "shortAnswer": "This kit covers the letters that evidence work and income: verification, proof of income, self-employment and job changes. Start from the letter the reviewer named, then use the kit's checklist to assemble what supports it.",
    "primaryCta": "Get the income kit",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Does this kit verify my employment?", "answer": "No. It gives you and your employer the letter formats; the employer signs and confirms. ApprovalPrep does not verify or certify employment or income." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/credit-letter-kit": {
    "heading": "Credit Letter Kit",
    "lead": "Do-it-yourself credit letters: dispute, goodwill, debt validation, and bureau follow-up templates, plus a checklist for spotting credit report errors.",
    "shortAnswer": "This kit covers do-it-yourself credit correspondence: disputes, goodwill requests, validation and follow-ups. Read your report first, decide whether the entry is wrong or simply unflattering, and use the letter that matches.",
    "primaryCta": "Get the credit letter kit",
    "secondaryCta": "Compare kits",
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
        "question": "Is this credit repair?",
        "answer": "No. ApprovalPrep does not repair credit, contact bureaus, remove accurate items, or promise score improvement. It helps you prepare your own paperwork."
      }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/rental-application-kit": {
    "heading": "Rental Application Kit",
    "lead": "Everything for a rental application: a checklist, a cover letter, rental history and income explanations, and a renter document packet to hand over.",
    "shortAnswer": "This kit assembles a renter's packet: the checklists, the cover letter and the explanations a leasing office may ask for. Build the packet once and reuse it, updating only the stubs and the property you are applying to.",
    "primaryCta": "Get the rental kit",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Does this kit include a background or credit check?", "answer": "No. ApprovalPrep does not run screening. Landlords order their own reports. The kit helps you prepare the documents and explanation letters that go with your application." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/loan-prep-letter-kit": {
    "heading": "Loan Prep Letter Kit",
    "lead": "Explanation letters for auto, mortgage, and personal loans that cover income, credit, and bank statement questions, plus a loan document checklist.",
    "shortAnswer": "This kit covers the explanation letters a lender asks for mid-review, across mortgage, auto and personal loans. Match the letter to the condition as the lender worded it, and answer only that condition.",
    "primaryCta": "Get the loan prep kit",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Will this kit get my loan approved?", "answer": "No. The lender decides. The kit helps you answer underwriting requests with clear letters and the right proof; ApprovalPrep does not contact lenders." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/business-funding-prep-kit": {
    "heading": "Business Funding Prep Kit",
    "lead": "Prepare for a business loan or SBA conversation: an SBA document checklist and letters for business income, cash flow, use of funds, and bank statements.",
    "shortAnswer": "This kit prepares a business funding packet: the document checklist, the financial explanations and the use of funds note. Have twelve months of business statements and current financials ready before you write anything.",
    "primaryCta": "Get the business funding kit",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Does this kit apply for funding for me?", "answer": "No. ApprovalPrep does not submit applications or contact lenders. The kit helps you assemble your formation documents, financials and use-of-funds summary before you apply." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/life-admin-letter-kit": {
    "heading": "Life Admin Letter Kit",
    "lead": "Letters for everyday paperwork: proof of residency, address verification, name changes, benefits, utility accounts, and general records requests.",
    "shortAnswer": "This kit covers everyday official paperwork: address and residency letters, identity checklists and records requests. Check what the office receiving it will actually accept, because requirements differ between agencies.",
    "primaryCta": "Create my letter",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
      { "question": "Does ApprovalPrep send these letters for me?", "answer": "No. You review, sign and send every letter yourself. ApprovalPrep does not contact anyone on your behalf." }
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  },
  "/complete-approvalprep-bundle": {
    "heading": "Complete ApprovalPrep Bundle",
    "lead": "The complete ApprovalPrep library in one purchase: every letter, checklist, and template across credit, income, rental, loans, business, and life admin.",
    "shortAnswer": "The bundle is every kit on the site in one purchase, for people facing several applications at once. Start with the kit for the nearest deadline, then work outward; the bundle does not expire.",
    "primaryCta": "Get the complete bundle",
    "secondaryCta": "Compare kits",
    "steps": [
      "Clarify the request or situation.",
      "Gather real supporting documents.",
      "Write the explanation or checklist notes in plain language.",
      "Review for truth, tone, dates, and completeness.",
      "Download or save the final files if using a kit.",
      "Send the materials yourself and keep copies."
    ],
    "faq": [
    ],
    "trustSignals": [
      "Instant verified download when a kit is purchased",
      "No account required",
      "PDF + editable DOCX for paid kits",
      "Self-service only"
    ],
    "noindexCtaAllowed": false
  }
};

export const routeCopy = { ...(generatedRouteCopyData.routes || {}), ...manualRouteCopy };

// What each paid kit adds after the free first letter, grouped by the moment she needs it.
// The free Studio's finished-letter card, its "what happens next" timeline and the kit's own page
// all read this one list, so free -> paid is one path in the same words.
//
// Every item is the name of something the kit really holds (data/products/products.json
// included_offerings); validate:letter-studio fails on a name the kit does not hold or an item
// left out. The letter the Studio already writes free is listed last, as "also included".
export const kitMoments = {
  // Credit Letter Kit version 2 (live 10 Nov 2026): the kit's own sections and letter names.
  "credit-letter-kit": {
    promise: "Everything after the envelope is sealed.",
    moments: [
      { when: "The bureau answered, or the deadline passed", items: ["credit bureau follow-up letter: no written results yet", "credit bureau follow-up letter: the bureau says the item was verified", "credit bureau follow-up letter: corrected, but still not right", "request to tell recent recipients about the correction", "statement of dispute to add to my file"] },
      { when: "Taking your proof to the company that reported it", items: ["direct dispute letter to the company that reported the item"] },
      { when: "A collector is involved", items: ["debt validation letter", "settlement terms in writing letter"] },
      { when: "The late payment was real", items: ["goodwill letter", "late payment explanation letter"] },
      { when: "Before your next dispute", items: ["credit report error checklist", "mailing and record log"] }
    ],
    alsoIncluded: ["credit dispute letter"],
    // The kit's letter for each answer a bureau can give ("The bureau answered" page).
    byAnswer: [
      { answer: "Corrected or deleted", items: ["request to tell recent recipients about the correction", "credit bureau follow-up letter: corrected, but still not right"] },
      { answer: "Verified, and you still believe it is wrong", items: ["statement of dispute to add to my file", "direct dispute letter to the company that reported the item", "credit bureau follow-up letter: the bureau says the item was verified"] },
      { answer: "Verified, and the information is accurate", items: ["goodwill letter"] },
      { answer: "No answer", items: ["credit bureau follow-up letter: no written results yet"] }
    ],
    working: [
      "Three lines above every letter: when to use it, what it is not for, where to send it",
      "A filled example under every letter",
      "The clock, and what each answer means",
      "Where to mail a dispute to each bureau, and the sources",
      "A PDF guide and an editable Word file"
    ]
  },
  // The other kits, version 2 (live 10 Nov 2026): each kit's own cover line, sections and names.
  "letter-of-explanation": {
    promise: "A letter written for your exact situation.",
    moments: [
      { when: "Credit or a late payment", items: ["credit explanation letter", "late payment explanation letter"] },
      { when: "Work or income", items: ["income gap explanation letter", "employment gap explanation letter"] },
      { when: "Housing", items: ["address history explanation letter", "rental issue explanation letter"] },
      { when: "Money and life events", items: ["bank statement explanation letter", "life event explanation letter"] },
      { when: "Keeping track", items: ["sent and received log"] }
    ],
    alsoIncluded: ["general application explanation letter"]
  },
  "income-employment-letter-kit": {
    promise: "The letters that go with your income and job history.",
    moments: [
      { when: "An employer has to confirm your job", items: ["employment verification letter (for your employer to sign)"] },
      { when: "You need to show what you earn", items: ["proof of income letter", "self-employment income letter", "bank statement explanation letter"] },
      { when: "Your work history changed", items: ["job change letter", "employment gap explanation letter"] },
      { when: "Keeping track", items: ["sent and received log"] }
    ],
    alsoIncluded: []
  },
  "rental-application-kit": {
    promise: "The whole rental packet, from before you apply to move-in.",
    moments: [
      { when: "Before you apply", items: ["apartment application checklist", "proof of income checklist", "renter document packet: cover sheet and order"] },
      { when: "With the application", items: ["rental cover letter", "rental history explanation", "income explanation for renters", "employment verification request (to your employer)"] },
      { when: "After you apply", items: ["landlord follow-up letter", "move-in document checklist", "sent and received log"] }
    ],
    alsoIncluded: []
  },
  "loan-prep-letter-kit": {
    promise: "The letters a lender asks for, and the follow-up.",
    moments: [
      { when: "The lender asks for a letter", items: ["auto loan explanation letter", "mortgage explanation letter (credit inquiries and new accounts)", "personal loan explanation letter"] },
      { when: "The question is about money or credit", items: ["income explanation letter (variable or changed income)", "credit explanation letter", "bank statement explanation letter"] },
      { when: "Keeping the file moving", items: ["loan document checklist", "lender follow-up letter", "sent and received log"] }
    ],
    alsoIncluded: []
  },
  "business-funding-prep-kit": {
    promise: "The paperwork around a business funding application.",
    moments: [
      { when: "The application", items: ["business loan explanation letter", "use of funds explanation", "SBA document checklist"] },
      { when: "The numbers", items: ["business income explanation", "cash flow explanation", "bank statement explanation (business account)"] },
      { when: "After you apply", items: ["business address verification", "lender follow-up letter (business application)", "sent and received log"] }
    ],
    alsoIncluded: []
  },
  "life-admin-letter-kit": {
    promise: "Letters for records, addresses and offices.",
    moments: [
      { when: "Proving where you live", items: ["address verification letter", "proof of residency letter (signed by the person you live with)"] },
      { when: "Records that do not match", items: ["name/address explanation", "identity document checklist"] },
      { when: "Asking an office for something", items: ["school/employer request letter", "general records request letter", "benefits explanation letter", "utility/account explanation letter", "sent and received log"] }
    ],
    alsoIncluded: []
  }
};

// The bundle is every kit in one file. Its list is built from the kits above, so it cannot name a
// letter no kit holds; a letter two kits share appears once, as it does in the file.
{
  const parts = [["Credit", "credit-letter-kit"], ["Explanations", "letter-of-explanation"], ["Income and work", "income-employment-letter-kit"], ["Renting", "rental-application-kit"], ["Loans", "loan-prep-letter-kit"], ["Business funding", "business-funding-prep-kit"], ["Records and offices", "life-admin-letter-kit"]];
  const logs = ["mailing and record log", "sent and received log"];
  const free = parts.flatMap(([, sku]) => kitMoments[sku].alsoIncluded);
  const seen = new Set([...logs, ...free]);
  const moments = parts.map(([when, sku]) => ({ when, items: kitMoments[sku].moments.flatMap((m) => m.items).filter((item) => !seen.has(item) && seen.add(item)) }));
  kitMoments["complete-approvalprep-bundle"] = {
    promise: "Every kit in one file: credit, explanations, income, renting, loans, business funding, records.",
    moments: [...moments, { when: "Keeping track", items: logs }],
    alsoIncluded: free,
    working: kitMoments["credit-letter-kit"].working
  };
}

// In every version 2 kit file, beside the named letters (read from the live kit files, 10 Nov 2026).
// A kit with its own `working` list (the version 2 credit kit) shows that instead.
export const inEveryKit = [
  "Three lines above every letter: when to use it, what it is not for, where to send it",
  "A filled example under every letter",
  "A page on what the person reading it wants to see, and the sources",
  "A PDF guide and an editable Word file"
];

/** A kit's contents with what comes after the free letter first and the free letter itself last. */
export function orderedOfferings(sku, offerings = []) {
  const kit = kitMoments[sku];
  if (!kit) return offerings.map((name) => ({ name, also: false }));
  const lead = kit.moments.flatMap((m) => m.items).filter((name) => offerings.includes(name));
  const rest = offerings.filter((name) => !lead.includes(name) && !kit.alsoIncluded.includes(name));
  return [...lead, ...rest].map((name) => ({ name, also: false })).concat(kit.alsoIncluded.filter((name) => offerings.includes(name)).map((name) => ({ name, also: true })));
}

// What each paid kit adds after the free first letter, grouped by the moment she needs it.
// The free Studio's finished-letter card, its "what happens next" timeline and the kit's own page
// all read this one list, so free -> paid is one path in the same words.
//
// Every item is the name of something the kit really holds (data/products/products.json
// included_offerings); validate:letter-studio fails on a name the kit does not hold or an item
// left out. The letter the Studio already writes free is listed last, as "also included".
export const kitMoments = {
  "credit-letter-kit": {
    promise: "Everything after the envelope is sealed.",
    moments: [
      { when: "No answer by day 30, or the bureau says “verified”", items: ["credit bureau follow-up letter"] },
      { when: "The late payment was real", items: ["goodwill letter", "late payment explanation letter"] },
      { when: "A collector is involved", items: ["debt validation letter", "pay-for-delete request letter"] },
      { when: "Before your next dispute", items: ["credit report error checklist"] }
    ],
    alsoIncluded: ["credit dispute letter"]
  },
  "letter-of-explanation": {
    promise: "A letter written for your exact situation.",
    moments: [
      { when: "Credit or a late payment", items: ["credit explanation letter", "late payment explanation letter"] },
      { when: "Work or income", items: ["income gap explanation letter", "employment gap explanation letter"] },
      { when: "Housing", items: ["address history explanation letter", "rental issue explanation letter"] },
      { when: "Money and life events", items: ["bank statement explanation letter", "life event explanation letter"] }
    ],
    alsoIncluded: ["general application explanation letter"]
  },
  "income-employment-letter-kit": {
    promise: "The letters that go with your income and job history.",
    moments: [
      { when: "An employer has to confirm your job", items: ["employment verification letter"] },
      { when: "You need to show what you earn", items: ["proof of income letter", "self-employment income letter", "bank statement explanation letter"] },
      { when: "Your work history changed", items: ["job change letter", "gap in employment letter"] }
    ],
    alsoIncluded: []
  },
  "rental-application-kit": {
    promise: "The whole rental packet, from before you apply to move-in.",
    moments: [
      { when: "Before you apply", items: ["apartment application checklist", "proof of income checklist", "renter document packet"] },
      { when: "With the application", items: ["rental cover letter", "rental history explanation", "income explanation for renters", "employment verification request"] },
      { when: "After you apply", items: ["landlord follow-up letter", "move-in document checklist"] }
    ],
    alsoIncluded: []
  },
  "loan-prep-letter-kit": {
    promise: "The letters a lender asks for, and the follow-up.",
    moments: [
      { when: "The lender asks for a letter", items: ["auto loan explanation letter", "mortgage explanation letter", "personal loan explanation letter"] },
      { when: "The question is about money or credit", items: ["income explanation letter", "credit explanation letter", "bank statement explanation letter"] },
      { when: "Keeping the file moving", items: ["loan document checklist", "lender follow-up letter"] }
    ],
    alsoIncluded: []
  },
  "business-funding-prep-kit": {
    promise: "The paperwork around a business funding application.",
    moments: [
      { when: "The application", items: ["business loan explanation letter", "use of funds explanation", "SBA document checklist"] },
      { when: "The numbers", items: ["business income explanation", "cash flow explanation", "bank statement explanation"] },
      { when: "After you apply", items: ["business address verification", "lender follow-up letter"] }
    ],
    alsoIncluded: []
  },
  "life-admin-letter-kit": {
    promise: "Letters for records, addresses and offices.",
    moments: [
      { when: "Proving where you live", items: ["address verification letter", "proof of residency letter"] },
      { when: "Records that do not match", items: ["name/address explanation", "identity document checklist"] },
      { when: "Asking an office for something", items: ["school/employer request letter", "general records request letter", "benefits explanation letter", "utility/account explanation letter"] }
    ],
    alsoIncluded: []
  }
};

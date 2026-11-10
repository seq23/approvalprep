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

// One page of each kit: the filled example the kit prints under its first letter. The people,
// companies and numbers are made up. No other paid page is in this repository.
export const kitSamples = {
  "credit-letter-kit": {
    title: "Credit bureau follow-up letter: no written results yet",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: [
      "Dana R. Whitfield", "418 Marlowe Street, Apt 2B", "Dayton, OH 45402", "", "March 16, 2026", "", "Experian", "P.O. Box 4500", "Allen, TX 75013", "",
      "Re: No written results received. Northgate Card Services, account ending 4471", "", "To whom it may concern:", "",
      "I mailed you a written dispute about the account named above on January 26, 2026. The certified mail return receipt shows that you received it on January 29, 2026. Copies of that letter and of the receipt are enclosed.", "",
      "As of today I have not received the written results of your reinvestigation. The Fair Credit Reporting Act, at 15 U.S.C. 1681i(a), gives a consumer reporting agency 30 days from the day it receives a dispute to complete its reinvestigation, and five business days after it finishes to send the consumer written notice of the results.", "",
      "Please send me the written results now, with a copy of the entry for this account as it stands after your reinvestigation. If the item could not be verified in the time allowed, please tell me what change was made to my file.", "",
      "If your results have already been mailed, please send a second copy to the address at the top of this letter.", "",
      "Sincerely,", "(signature)", "Dana R. Whitfield", "",
      "Enclosures:", "- Copy of my dispute letter dated January 26, 2026", "- Copy of the certified mail receipt and return receipt"
    ]
  },
  "letter-of-explanation": {
    title: "Credit explanation letter",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: ["Dana R. Whitfield", "418 Marlowe Street, Apt 2B", "Dayton, OH 45402", "", "March 16, 2026", "", "Marcus Bell", "Loan Officer, Three Rivers Credit Union", "600 Wayne Avenue", "Dayton, OH 45410", "", "Re: Explanation of credit history. Application number TR-2026-01844", "", "Dear Mr. Bell:", "", "You asked me to explain the following on my credit report: the collection account from Lakemont Recovery Group for Brightway Wireless, opened June 2024, and late payments on two cards between May and August 2024.", "", "These entries are correct. They come from one period, May to August 2024, when my employer closed its Dayton warehouse and I was out of work for fourteen weeks.", "", "During that time I kept my rent and car loan current and fell behind on the two cards and the phone bill. I returned to full-time work on September 3, 2024.", "", "Since then: the Brightway collection was paid in full on January 15, 2025; both cards were brought current in October 2024 and have been paid on time for seventeen months.", "", "The enclosed documents show the layoff, my return to work and the payoff. I am glad to send anything else the underwriter needs.", "", "Sincerely,", "(signature)", "Dana R. Whitfield", "", "Enclosures:", "- Copy of layoff notice dated May 6, 2024", "- Copy of offer letter dated August 22, 2024", "- Copy of paid-in-full letter dated January 15, 2025"]
  },
  "income-employment-letter-kit": {
    title: "Employment verification letter (for your employer to sign)",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: ["KETTERING SUPPLY CO.", "3100 Wilmington Pike", "Kettering, OH 45429", "", "March 16, 2026", "", "Three Rivers Credit Union", "600 Wayne Avenue, Dayton, OH 45410", "", "Re: Verification of employment for Dana R. Whitfield", "", "To whom it may concern:", "", "This letter confirms that Dana R. Whitfield is employed by Kettering Supply Co.", "", "Date of hire: September 3, 2024. Job title: Warehouse Lead. Status: full time, 40 hours a week. Type of position: permanent.", "", "Current pay: $27.50 an hour, paid every two weeks. Overtime varies and is not a fixed part of pay.", "", "This information comes from our personnel and payroll records. To confirm it, please contact me at (937) 555-0170 or jalvarez@ketteringsupply.example.", "", "Sincerely,", "(signature)", "Joan Alvarez", "Human Resources Manager"]
  },
  "rental-application-kit": {
    title: "Rental cover letter",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: ["Dana R. Whitfield", "418 Marlowe Street, Apt 2B", "Dayton, OH 45402", "", "March 16, 2026", "", "Priya Nair", "Property Manager, Alder Street Apartments", "1500 Alder Street", "Kettering, OH 45429", "", "Re: Application for Apt 304, 1500 Alder Street", "", "Dear Ms. Nair:", "", "I am applying to rent Apt 304, 1500 Alder Street, and I would like to move in on May 1, 2026. I will be the only resident.", "", "I work full time at Kettering Supply Co. as a warehouse lead, since September 2024. My gross income is $4,766.67 a month, which is 3.6 times the listed rent of $1,325.00.", "", "I have rented my current home at 418 Marlowe Street, Apt 2B, Dayton for two years and four months. My landlord, Tom Reyes, (937) 555-0188, can confirm that my rent has been paid on time.", "", "Enclosed are my completed application, photo ID, pay stubs and references. I have also enclosed a short letter about my tenancy at an earlier address in 2023, so that you have the facts from me.", "", "I can be reached at (937) 555-0142 and can meet or bring anything further on short notice.", "", "Sincerely,", "(signature)", "Dana R. Whitfield", "", "Enclosures:", "- Completed application", "- Copy of photo ID", "- Proof of income: four most recent pay stubs", "- References"]
  },
  "loan-prep-letter-kit": {
    title: "Auto loan explanation letter",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: ["Dana R. Whitfield", "418 Marlowe Street, Apt 2B", "Dayton, OH 45402", "", "March 16, 2026", "", "Renee Dalton", "Finance Manager, Miami Valley Motors", "4400 Salem Avenue", "Dayton, OH 45416", "", "Re: Explanation for auto loan application. Stock no. MV-7731", "", "Dear Ms. Dalton:", "", "You asked me to explain the voluntary surrender of a vehicle that appears on my credit report from 2023 before my application for the 2022 Toyota Corolla can be decided.", "", "In April 2023 my hours were cut from 40 to 22 a week. I could not keep up the payments on my 2020 Nissan Rogue and returned it to Crestline Auto Credit on June 12, 2023, rather than let it be repossessed. The car was sold, and I paid the remaining balance of $2,318.44 in instalments. The account has shown a zero balance since March 2024.", "", "My position now is different in ways that bear on this loan: I have earned $27.50 an hour full time at Kettering Supply Co. since September 2024, I am putting $3,000.00 down, and the monthly payment I have asked for is $180 less than the old one.", "", "The enclosed pay stubs and the paid-in-full letter show these facts.", "", "Sincerely,", "(signature)", "Dana R. Whitfield", "", "Enclosures:", "- Copy of paid-in-full letter from Crestline Auto Credit, March 2024", "- Copies of my four most recent pay stubs"]
  },
  "business-funding-prep-kit": {
    title: "Business loan explanation letter",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: ["Marlowe Street Bakery LLC", "212 Marlowe Street", "Dayton, OH 45402", "", "March 16, 2026", "", "Elena Park", "Business Banking Officer, Three Rivers Credit Union", "600 Wayne Avenue", "Dayton, OH 45410", "", "Re: Explanation to accompany loan application. Marlowe Street Bakery LLC. Application number BL-2026-0318", "", "Dear Ms. Park:", "", "In reviewing the financial statements of Marlowe Street Bakery LLC, you will see a net loss of $14,870 for 2024, after profits in 2022 and 2023. This letter explains it.", "", "Cause: from March to July 2024 the city closed Marlowe Street for water main replacement. Walk-in sales, normally 70% of revenue, fell by about half for those five months.", "", "What we did: we began wholesale delivery to four cafes in May 2024, cut Sunday hours, and deferred the owner's draw for three months.", "", "Where things stand: the street reopened in August 2024. Revenue for 2025 was $412,600, up from $318,900 in 2024, and the business earned a net profit of $38,240. Wholesale now accounts for 22% of sales.", "", "The event that caused the loss has ended, and the statements enclosed show each figure above.", "", "Sincerely,", "(signature)", "Luis Ortega", "Owner and Managing Member", "", "Enclosures:", "- Profit and loss statements for 2023, 2024 and 2025", "- Copy of the city's street closure notice dated February 12, 2024"]
  },
  "life-admin-letter-kit": {
    title: "Address verification letter",
    note: "Filled example. Sample only: the person, companies and numbers are made up.",
    lines: ["Dana R. Whitfield", "418 Marlowe Street, Apt 2B", "Dayton, OH 45402", "", "March 16, 2026", "", "Gem City Bank, Account Services", "P.O. Box 1402", "Dayton, OH 45401", "", "Re: Confirmation of my address. Account ending 8820", "", "To whom it may concern:", "", "I am writing to confirm my current residential address for your records.", "", "I live at 418 Marlowe Street, Apt 2B, Dayton, OH 45402 and have lived there since December 1, 2023. This is also my mailing address.", "", "Your records may show my previous address, 90 Burkhardt Court, Apt 11, Riverside, OH 45431. I no longer live there or receive mail there. Please replace it with the address above.", "", "Two documents showing my name at the current address are enclosed, as your office requires.", "", "Sincerely,", "(signature)", "Dana R. Whitfield", "", "Enclosures:", "- Copy of my current lease, first and signature pages", "- Copy of my electric bill dated March 3, 2026"]
  }
};
// The bundle shows the credit kit's page: it holds that letter too.
kitSamples["complete-approvalprep-bundle"] = kitSamples["credit-letter-kit"];


/** A kit's contents with what comes after the free letter first and the free letter itself last. */
export function orderedOfferings(sku, offerings = []) {
  const kit = kitMoments[sku];
  if (!kit) return offerings.map((name) => ({ name, also: false }));
  const lead = kit.moments.flatMap((m) => m.items).filter((name) => offerings.includes(name));
  const rest = offerings.filter((name) => !lead.includes(name) && !kit.alsoIncluded.includes(name));
  return [...lead, ...rest].map((name) => ({ name, also: false })).concat(kit.alsoIncluded.filter((name) => offerings.includes(name)).map((name) => ({ name, also: true })));
}

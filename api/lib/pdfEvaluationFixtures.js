import { PDFDocument, StandardFonts } from "pdf-lib";

const BASE_PAGES = [
  {
    type: "Promissory Note",
    title: "PROMISSORY NOTE",
    lines: [
      "Loan No.: LN-900001",
      "Date: August 9, 2026",
      'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")',
      "promise to pay to Assay Demo Lending, Inc. the principal sum of $325,000.00.",
      "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
    ],
  },
  {
    type: "Promissory Note",
    title: "PROMISSORY NOTE",
    lines: [
      "Loan No.: LN-900001",
      "The unpaid principal balance bears interest at 6.250% annually.",
      "This Note is secured by a Deed of Trust dated the same day.",
      "Signature: Maya Patel",
      "Signature: Rohan Patel",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
    ],
  },
  {
    type: "Mortgage or Deed of Trust",
    title: "DEED OF TRUST",
    lines: [
      "Loan No.: LN-900001",
      "This security instrument covers the property described below.",
      "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
    ],
  },
  {
    type: "Closing Disclosure",
    title: "CLOSING DISCLOSURE",
    lines: [
      "Loan No.: LN-900001",
      "Closing Date: August 9, 2026",
      "Loan Terms",
      "Projected Payments",
      "Cash to Close",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
      "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
    ],
  },
  {
    type: "Notice of Right to Cancel",
    title: "NOTICE OF RIGHT TO CANCEL",
    lines: [
      "Loan No.: LN-900001",
      "Transaction Date: August 9, 2026",
      "Cancellation Deadline: August 12, 2026",
      "You may cancel this transaction within the applicable period.",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
      "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
    ],
  },
  {
    type: "Occupancy Affidavit",
    title: "OCCUPANCY AFFIDAVIT",
    lines: [
      "Loan No.: LN-900001",
      "Borrower intends to occupy the property as a principal residence.",
      "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
    ],
  },
  {
    type: "Signature/Name Affidavit",
    title: "SIGNATURE / NAME AFFIDAVIT",
    lines: [
      "Loan No.: LN-900001",
      "Maya Patel and Rohan Patel certify that the names shown refer to the same persons.",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
    ],
  },
  {
    type: "Notary Acknowledgment",
    title: "NOTARY ACKNOWLEDGMENT",
    lines: [
      "State of Texas",
      "Acknowledged before me on August 9, 2026.",
      "NOTARY PUBLIC",
      "My commission expires November 30, 2028.",
    ],
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function replaceLine(page, matcher, replacement) {
  page.lines = page.lines.map((line) => matcher.test(line) ? replacement : line);
}

function removeLines(pages, matcher) {
  pages.forEach((page) => {
    page.lines = page.lines.filter((line) => !matcher.test(line));
  });
}

function label({ expectedRecommendation, jurisdiction = "TX", loanNumber = "LN-900001", loanNumberCandidates = ["LN-900001"], pageTypes = null }) {
  return {
    expectedRecommendation,
    pageTypes: pageTypes || BASE_PAGES.map((page) => page.type),
    fields: {
      loanNumber,
      loanNumberCandidates,
      borrowers: ["Maya Patel", "Rohan Patel"],
      jurisdiction,
      noteExecutionDate: "2026-08-09",
      closingDate: "2026-08-09",
      rtcTransactionDate: "2026-08-09",
      rtcCancellationDeadline: "2026-08-12",
      notaryAcknowledgmentDate: "2026-08-09",
      notaryCommissionExpirationDate: "2028-11-30",
    },
    evidencePages: {
      loanNumber: 1,
      borrowers: 1,
      jurisdiction: jurisdiction ? 1 : null,
      noteExecutionDate: 1,
      closingDate: 4,
      rtcTransactionDate: 5,
      rtcCancellationDeadline: 5,
      notaryAcknowledgmentDate: 8,
      notaryCommissionExpirationDate: 8,
    },
  };
}

export const PDF_EVALUATION_SCENARIOS = Object.freeze([
  {
    id: "PDF-001",
    name: "Clean machine-readable package",
    category: "Clean baseline",
    description: "Eight-page digital PDF with all target document types and internally consistent structured evidence.",
    label: label({ expectedRecommendation: "Needs Review" }),
    mutate() {},
  },
  {
    id: "PDF-002",
    name: "Unknown page in package",
    category: "Classification routing",
    description: "Replaces the occupancy affidavit with an unsupported executed form so the page should remain explicitly unknown.",
    label: label({
      expectedRecommendation: "Needs Review",
      pageTypes: BASE_PAGES.map((page, index) => index === 5 ? "Unknown document" : page.type),
    }),
    mutate(pages) {
      pages[5] = {
        type: "Unknown document",
        title: "BORROWER DISCLOSURE",
        lines: [
          "Loan No.: LN-900001",
          "This executed disclosure is intentionally outside the prototype document taxonomy.",
          "Borrower: Maya Patel",
          "Borrower: Rohan Patel",
        ],
      };
    },
  },
  {
    id: "PDF-003",
    name: "Unresolved jurisdiction",
    category: "Context routing",
    description: "Removes supported property-state evidence and uses an unsupported notary venue so Assay must not invent a TX/CA/FL profile.",
    label: label({ expectedRecommendation: "Needs Review", jurisdiction: null }),
    mutate(pages) {
      removeLines(pages, /Property Address:/i);
      replaceLine(pages[7], /State of Texas/i, "State of Nevada");
    },
  },
  {
    id: "PDF-004",
    name: "Conflicting loan identifiers",
    category: "Deterministic exception",
    description: "Closing Disclosure carries a different loan number from the rest of the package.",
    label: label({
      expectedRecommendation: "Exception Identified",
      loanNumber: null,
      loanNumberCandidates: ["LN-900001", "LN-900002"],
    }),
    mutate(pages) {
      replaceLine(pages[3], /Loan No\.:/i, "Loan No.: LN-900002");
    },
  },
  {
    id: "PDF-005",
    name: "Impossible date chronology",
    category: "Deterministic exception",
    description: "RTC deadline and notary commission expiration each precede their corresponding execution date.",
    label: {
      ...label({ expectedRecommendation: "Exception Identified" }),
      fields: {
        ...label({ expectedRecommendation: "Exception Identified" }).fields,
        rtcCancellationDeadline: "2026-08-08",
        notaryCommissionExpirationDate: "2026-08-08",
      },
    },
    mutate(pages) {
      replaceLine(pages[4], /Cancellation Deadline:/i, "Cancellation Deadline: August 8, 2026");
      replaceLine(pages[7], /My commission expires/i, "My commission expires August 8, 2026.");
    },
  },
].map((scenario) => Object.freeze({ ...scenario, label: Object.freeze(scenario.label) })));

export function getPdfEvaluationScenario(id) {
  return PDF_EVALUATION_SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export async function createPdfEvaluationFixture(id) {
  const scenario = getPdfEvaluationScenario(id);
  if (!scenario) throw new Error(`Unknown PDF evaluation scenario: ${id}`);

  const pages = clone(BASE_PAGES);
  scenario.mutate(pages);

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  for (const spec of pages) {
    const page = pdf.addPage([612, 792]);
    page.drawText(spec.title, { x: 54, y: 730, size: 16, font: bold });
    spec.lines.forEach((line, index) => page.drawText(line, { x: 54, y: 690 - index * 24, size: 10.5, font: regular }));
    page.drawText(`Assay ${scenario.id} synthetic evaluation fixture. Not a legal instrument.`, { x: 54, y: 48, size: 9, font: italic });
  }

  const bytes = await pdf.save();
  return {
    scenario: { id: scenario.id, name: scenario.name, category: scenario.category, description: scenario.description, label: scenario.label },
    base64Source: Buffer.from(bytes).toString("base64"),
    pageCount: pages.length,
    byteLength: bytes.length,
  };
}

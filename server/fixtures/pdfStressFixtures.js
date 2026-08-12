import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

const BASE_PAGES = [
  { type: "Promissory Note", title: "PROMISSORY NOTE", lines: ["Loan No.: LN-900001", "Date: August 9, 2026", 'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")', "promise to pay to Assay Demo Lending, Inc. the principal sum of $325,000.00.", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024", "Borrower: Maya Patel", "Borrower: Rohan Patel"] },
  { type: "Promissory Note", title: "PROMISSORY NOTE", lines: ["Loan No.: LN-900001", "The unpaid principal balance bears interest at 6.250% annually.", "This Note is secured by a Deed of Trust dated the same day.", "Signature: Maya Patel", "Signature: Rohan Patel", "Borrower: Maya Patel", "Borrower: Rohan Patel"] },
  { type: "Mortgage or Deed of Trust", title: "DEED OF TRUST", lines: ["Loan No.: LN-900001", "This security instrument covers the property described below.", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024", "Borrower: Maya Patel", "Borrower: Rohan Patel"] },
  { type: "Closing Disclosure", title: "CLOSING DISCLOSURE", lines: ["Loan No.: LN-900001", "Closing Date: August 9, 2026", "Loan Terms", "Projected Payments", "Cash to Close", "Borrower: Maya Patel", "Borrower: Rohan Patel", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024"] },
  { type: "Notice of Right to Cancel", title: "NOTICE OF RIGHT TO CANCEL", lines: ["Loan No.: LN-900001", "Transaction Date: August 9, 2026", "Cancellation Deadline: August 12, 2026", "You may cancel this transaction within the applicable period.", "Borrower: Maya Patel", "Borrower: Rohan Patel", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024"] },
  { type: "Occupancy Affidavit", title: "OCCUPANCY AFFIDAVIT", lines: ["Loan No.: LN-900001", "Borrower intends to occupy the property as a principal residence.", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024"] },
  { type: "Signature/Name Affidavit", title: "SIGNATURE / NAME AFFIDAVIT", lines: ["Loan No.: LN-900001", "Maya Patel and Rohan Patel certify that the names shown refer to the same persons.", "Borrower: Maya Patel", "Borrower: Rohan Patel"] },
  { type: "Notary Acknowledgment", title: "NOTARY ACKNOWLEDGMENT", lines: ["State of Texas", "Acknowledged before me on August 9, 2026.", "NOTARY PUBLIC", "My commission expires November 30, 2028."] },
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function baseLabel(overrides = {}) {
  return {
    expectedRecommendation: "Needs Review",
    pageTypes: BASE_PAGES.map((page) => page.type),
    fields: { loanNumber: "LN-900001", loanNumberCandidates: ["LN-900001"], borrowers: ["Maya Patel", "Rohan Patel"], jurisdiction: "TX", noteExecutionDate: "2026-08-09", closingDate: "2026-08-09", rtcTransactionDate: "2026-08-09", rtcCancellationDeadline: "2026-08-12", notaryAcknowledgmentDate: "2026-08-09", notaryCommissionExpirationDate: "2028-11-30" },
    evidencePages: { loanNumber: 1, borrowers: 1, jurisdiction: 1, noteExecutionDate: 1, closingDate: 4, rtcTransactionDate: 5, rtcCancellationDeadline: 5, notaryAcknowledgmentDate: 8, notaryCommissionExpirationDate: 8 },
    ...overrides,
  };
}

export const PDF_STRESS_SCENARIOS = Object.freeze([
  Object.freeze({ id: "STRESS-001", name: "Mixed page rotation", category: "Orientation stress", description: "Keeps the clean package content but rotates selected pages 90 or 270 degrees to test page-orientation recovery.", label: Object.freeze(baseLabel()), mode: "rotation" }),
  Object.freeze({ id: "STRESS-002", name: "Low-contrast compact layout", category: "Typography and layout stress", description: "Uses smaller, lighter text and a denser two-column layout while preserving the same labeled package facts.", label: Object.freeze(baseLabel()), mode: "compact" }),
  Object.freeze({ id: "STRESS-003", name: "Duplicated closing page / missing notary", category: "Package structure stress", description: "Replaces the notary page with a duplicate Closing Disclosure so the QC-only sample profile should surface the missing configured document as an inventory exception.", label: Object.freeze(baseLabel({ expectedRecommendation: "Exception Identified", pageTypes: BASE_PAGES.map((page, index) => index === 7 ? "Closing Disclosure" : page.type), fields: { ...baseLabel().fields, notaryAcknowledgmentDate: null, notaryCommissionExpirationDate: null }, evidencePages: { ...baseLabel().evidencePages, notaryAcknowledgmentDate: null, notaryCommissionExpirationDate: null } })), mode: "structure" }),
]);

export function getPdfStressScenario(id) { return PDF_STRESS_SCENARIOS.find((scenario) => scenario.id === id) || null; }
function drawStandardPage(page, spec, fonts) { page.drawText(spec.title, { x: 54, y: 730, size: 16, font: fonts.bold }); spec.lines.forEach((line, index) => page.drawText(line, { x: 54, y: 690 - index * 24, size: 10.5, font: fonts.regular })); }
function drawCompactPage(page, spec, fonts) { const ink = rgb(0.58, 0.58, 0.58); page.drawText(spec.title, { x: 44, y: 738, size: 11.5, font: fonts.bold, color: ink }); spec.lines.forEach((line, index) => { const column = index % 2; const row = Math.floor(index / 2); page.drawText(line, { x: column === 0 ? 44 : 310, y: 700 - row * 32, size: 7.4, font: fonts.regular, color: ink, maxWidth: 245 }); }); }

export async function createPdfStressFixture(id) {
  const scenario = getPdfStressScenario(id); if (!scenario) throw new Error(`Unknown PDF stress scenario: ${id}`);
  const pages = clone(BASE_PAGES); if (scenario.mode === "structure") pages[7] = clone(BASE_PAGES[3]);
  const pdf = await PDFDocument.create(); const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold), italic: await pdf.embedFont(StandardFonts.HelveticaOblique) };
  pages.forEach((spec, index) => { const page = pdf.addPage([612, 792]); if (scenario.mode === "compact") drawCompactPage(page, spec, fonts); else drawStandardPage(page, spec, fonts); if (scenario.mode === "rotation") { if (index === 3 || index === 7) page.setRotation(degrees(90)); if (index === 4) page.setRotation(degrees(270)); } page.drawText(`Assay ${scenario.id} synthetic stress fixture. Not a legal instrument.`, { x: 44, y: 40, size: 8, font: fonts.italic, color: rgb(0.55, 0.55, 0.55) }); });
  const bytes = await pdf.save();
  return { scenario: { id: scenario.id, name: scenario.name, category: scenario.category, description: scenario.description, label: scenario.label }, base64Source: Buffer.from(bytes).toString("base64"), pageCount: pages.length, byteLength: bytes.length };
}

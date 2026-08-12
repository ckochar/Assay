import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;

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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function label() {
  return {
    expectedRecommendation: "Needs Review",
    pageTypes: BASE_PAGES.map((page) => page.type),
    fields: {
      loanNumber: "LN-900001",
      loanNumberCandidates: ["LN-900001"],
      borrowers: ["Maya Patel", "Rohan Patel"],
      jurisdiction: "TX",
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
      jurisdiction: 1,
      noteExecutionDate: 1,
      closingDate: 4,
      rtcTransactionDate: 5,
      rtcCancellationDeadline: 5,
      notaryAcknowledgmentDate: 8,
      notaryCommissionExpirationDate: 8,
    },
  };
}

export const PDF_RASTER_STRESS_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "RASTER-001",
    name: "Low-resolution grayscale scan",
    category: "Raster OCR stress",
    description: "Image-only 96-DPI grayscale pages with JPEG compression. No PDF text layer is present.",
    dpi: 96,
    grayscale: true,
    jpegQuality: 58,
    blurSigma: 0,
    rotateDegrees: 0,
    label: Object.freeze(label()),
  }),
  Object.freeze({
    id: "RASTER-002",
    name: "Skewed compressed scan",
    category: "Raster OCR stress",
    description: "Image-only 150-DPI grayscale pages with mild image-level rotation, blur, and JPEG compression.",
    dpi: 150,
    grayscale: true,
    jpegQuality: 52,
    blurSigma: 0.55,
    rotateDegrees: 1.6,
    label: Object.freeze(label()),
  }),
]);

export function getPdfRasterStressScenario(id) {
  return PDF_RASTER_STRESS_SCENARIOS.find((scenario) => scenario.id === id) || null;
}

function pageSvg(spec, width, height) {
  const scale = width / 816;
  const titleSize = Math.round(22 * scale);
  const bodySize = Math.round(14 * scale);
  const left = Math.round(64 * scale);
  const titleY = Math.round(90 * scale);
  const firstLineY = Math.round(145 * scale);
  const lineGap = Math.round(34 * scale);
  const footerY = height - Math.round(55 * scale);

  const lines = spec.lines.map((line, index) =>
    `<text x="${left}" y="${firstLineY + index * lineGap}" font-family="Arial, Helvetica, sans-serif" font-size="${bodySize}" fill="#1d1d1d">${escapeXml(line)}</text>`,
  ).join("");

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#fbfbf8"/>
      <text x="${left}" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="700" fill="#111">${escapeXml(spec.title)}</text>
      ${lines}
      <text x="${left}" y="${footerY}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(10, Math.round(11 * scale))}" fill="#777">Assay synthetic raster evaluation fixture. Not a legal instrument.</text>
    </svg>
  `);
}

async function renderPageJpeg(spec, scenario) {
  const width = Math.round(8.5 * scenario.dpi);
  const height = Math.round(11 * scenario.dpi);
  let pipeline = sharp(pageSvg(spec, width, height), { density: scenario.dpi })
    .flatten({ background: "#ffffff" });

  if (scenario.grayscale) pipeline = pipeline.grayscale();
  if (scenario.blurSigma > 0) pipeline = pipeline.blur(scenario.blurSigma);
  if (scenario.rotateDegrees) pipeline = pipeline.rotate(scenario.rotateDegrees, { background: "#ffffff" });

  return pipeline.jpeg({ quality: scenario.jpegQuality, chromaSubsampling: "4:4:4" }).toBuffer();
}

export async function createPdfRasterStressFixture(id) {
  const scenario = getPdfRasterStressScenario(id);
  if (!scenario) throw new Error(`Unknown PDF raster stress scenario: ${id}`);

  const pdf = await PDFDocument.create();
  for (const spec of BASE_PAGES) {
    const jpegBytes = await renderPageJpeg(spec, scenario);
    const image = await pdf.embedJpg(jpegBytes);
    const page = pdf.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    page.drawImage(image, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
  }

  const bytes = await pdf.save({ useObjectStreams: false });
  return {
    scenario: {
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      description: scenario.description,
      label: scenario.label,
      dpi: scenario.dpi,
      jpegQuality: scenario.jpegQuality,
      blurSigma: scenario.blurSigma,
      rotateDegrees: scenario.rotateDegrees,
    },
    base64Source: Buffer.from(bytes).toString("base64"),
    pageCount: BASE_PAGES.length,
    byteLength: bytes.length,
    imageOnly: true,
  };
}

import { PDFDocument, StandardFonts } from "pdf-lib";
import { isAzureConfigured, startDocumentAnalysis } from "./lib/azureDocumentIntelligence.js";

const TOKEN = "1BnZ5_BkR-yo6jsEdjnY4gFELs7sLzYGcoWK0xKstg8";
const EXPIRES_AT = Date.parse("2026-08-12T03:05:00Z");
const ALLOWED = new Set(["PDF-001", "PDF-002", "PDF-003", "PDF-004", "PDF-005"]);

function send(response, status, payload) { response.status(status).json(payload); }
function replaceLine(page, matcher, replacement) { page.lines = page.lines.map((line) => matcher.test(line) ? replacement : line); }

function pagesFor(id) {
  const pages = [
    ["PROMISSORY NOTE", ["Loan No.: LN-900001", "Date: August 9, 2026", 'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")', "promise to pay to Assay Demo Lending, Inc. the principal sum of $325,000.00.", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024", "Borrower: Maya Patel", "Borrower: Rohan Patel"]],
    ["PROMISSORY NOTE", ["Loan No.: LN-900001", "The unpaid principal balance bears interest at 6.250% annually.", "This Note is secured by a Deed of Trust dated the same day.", "Signature: Maya Patel", "Signature: Rohan Patel", "Borrower: Maya Patel", "Borrower: Rohan Patel"]],
    ["DEED OF TRUST", ["Loan No.: LN-900001", "This security instrument covers the property described below.", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024", "Borrower: Maya Patel", "Borrower: Rohan Patel"]],
    ["CLOSING DISCLOSURE", ["Loan No.: LN-900001", "Closing Date: August 9, 2026", "Loan Terms", "Projected Payments", "Cash to Close", "Borrower: Maya Patel", "Borrower: Rohan Patel", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024"]],
    ["NOTICE OF RIGHT TO CANCEL", ["Loan No.: LN-900001", "Transaction Date: August 9, 2026", "Cancellation Deadline: August 12, 2026", "You may cancel this transaction within the applicable period.", "Borrower: Maya Patel", "Borrower: Rohan Patel", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024"]],
    ["OCCUPANCY AFFIDAVIT", ["Loan No.: LN-900001", "Borrower intends to occupy the property as a principal residence.", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024"]],
    ["SIGNATURE / NAME AFFIDAVIT", ["Loan No.: LN-900001", "Maya Patel and Rohan Patel certify that the names shown refer to the same persons.", "Borrower: Maya Patel", "Borrower: Rohan Patel"]],
    ["NOTARY ACKNOWLEDGMENT", ["State of Texas", "Acknowledged before me on August 9, 2026.", "NOTARY PUBLIC", "My commission expires November 30, 2028."]],
  ].map(([title, lines]) => ({ title, lines: [...lines] }));

  if (id === "PDF-002") pages[5] = { title: "BORROWER DISCLOSURE", lines: ["Loan No.: LN-900001", "This executed disclosure is intentionally outside the prototype document taxonomy.", "Borrower: Maya Patel", "Borrower: Rohan Patel"] };
  if (id === "PDF-003") {
    pages.forEach((page) => { page.lines = page.lines.filter((line) => !/Property Address:/i.test(line)); });
    pages[7].lines = pages[7].lines.filter((line) => !/State of Texas/i.test(line));
  }
  if (id === "PDF-004") replaceLine(pages[3], /Loan No\.:/i, "Loan No.: LN-900002");
  if (id === "PDF-005") {
    replaceLine(pages[4], /Cancellation Deadline:/i, "Cancellation Deadline: August 8, 2026");
    replaceLine(pages[7], /My commission expires/i, "My commission expires August 8, 2026.");
  }
  return pages;
}

async function buildPdf(id) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  for (const spec of pagesFor(id)) {
    const page = pdf.addPage([612, 792]);
    page.drawText(spec.title, { x: 54, y: 730, size: 16, font: bold });
    spec.lines.forEach((line, index) => page.drawText(line, { x: 54, y: 690 - index * 24, size: 10.5, font: regular }));
    page.drawText(`Assay ${id} synthetic benchmark. Not a legal instrument.`, { x: 54, y: 48, size: 9, font: italic });
  }
  return Buffer.from(await pdf.save()).toString("base64");
}

export default async function handler(request, response) {
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });
  if (Date.now() > EXPIRES_AT) return send(response, 410, { error: "Benchmark starter expired" });
  if (request.query.token !== TOKEN) return send(response, 404, { error: "Not found" });
  if (!ALLOWED.has(request.query.scenario)) return send(response, 404, { error: "Unknown scenario" });
  if (!isAzureConfigured()) return send(response, 503, { error: "Azure is not configured" });
  try {
    const startedAt = Date.now();
    const operation = await startDocumentAnalysis({ base64Source: await buildPdf(request.query.scenario), pages: "1-8" });
    return send(response, 202, { scenario: request.query.scenario, analysisId: operation.resultId, startedAt, modelId: operation.modelId, apiVersion: operation.apiVersion });
  } catch (error) {
    return send(response, error.statusCode || 502, { error: error.message || "Unable to start benchmark" });
  }
}

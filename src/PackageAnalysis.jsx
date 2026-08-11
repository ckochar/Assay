import React, { useState } from "react";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", blue: "#215f87", blueSoft: "#e8f1f7",
  review: "#93620a", reviewSoft: "#f8efd9", fail: "#ad312b", failSoft: "#fae9e7",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

function Button({ children, onClick, disabled, secondary = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ ...display, border: secondary ? `1px solid ${C.line}` : 0, background: disabled ? "#e8ecea" : secondary ? C.panel : C.teal, color: disabled ? "#84918c" : secondary ? C.ink : "white", borderRadius: 8, padding: "10px 14px", fontWeight: 760, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function createSamplePackage() {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const addPage = (title, lines) => {
    const page = pdf.addPage([612, 792]);
    page.drawText(title, { x: 54, y: 730, size: 16, font: bold });
    lines.forEach((line, index) => page.drawText(line, { x: 54, y: 690 - index * 24, size: 10.5, font: regular }));
    page.drawText("Assay sample package. Not a legal instrument.", { x: 54, y: 48, size: 9, font: italic });
  };

  addPage("PROMISSORY NOTE", [
    "Loan No.: LN-900001",
    "Date: August 9, 2026",
    'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")',
    "promise to pay to Assay Demo Lending, Inc. the principal sum of $325,000.00.",
    "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
    "Borrower: Maya Patel",
    "Borrower: Rohan Patel",
  ]);
  addPage("PROMISSORY NOTE", [
    "Loan No.: LN-900001",
    "The unpaid principal balance bears interest at 6.250% annually.",
    "This Note is secured by a Deed of Trust dated the same day.",
    "Borrower: Maya Patel",
    "Borrower: Rohan Patel",
  ]);
  addPage("DEED OF TRUST", [
    "Loan No.: LN-900001",
    "This security instrument covers the property described below.",
    "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
    "Borrower: Maya Patel",
    "Borrower: Rohan Patel",
  ]);
  addPage("CLOSING DISCLOSURE", [
    "Loan No.: LN-900001",
    "Loan Terms",
    "Projected Payments",
    "Cash to Close",
    "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
  ]);
  addPage("NOTICE OF RIGHT TO CANCEL", [
    "Loan No.: LN-900001",
    "You may cancel this transaction within the applicable period.",
    "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
  ]);
  addPage("OCCUPANCY AFFIDAVIT", [
    "Loan No.: LN-900001",
    "Borrower intends to occupy the property as a principal residence.",
    "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
  ]);
  addPage("SIGNATURE / NAME AFFIDAVIT", [
    "Loan No.: LN-900001",
    "Maya Patel and Rohan Patel certify that the names shown refer to the same persons.",
    "Borrower: Maya Patel",
    "Borrower: Rohan Patel",
  ]);
  addPage("NOTARY ACKNOWLEDGMENT", [
    "State of Texas",
    "Acknowledged before me on August 9, 2026.",
    "NOTARY PUBLIC",
    "My commission expires November 30, 2028.",
  ]);

  return new File([await pdf.save()], "sample-mortgage-package.pdf", { type: "application/pdf" });
}

function statusTone(status) {
  if (status === "Ready for QC Evaluation") return { color: C.teal, background: C.tealSoft };
  return { color: C.review, background: C.reviewSoft };
}

export default function PackageAnalysis() {
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);

  const reset = (nextFile) => { setFile(nextFile); setPhase("idle"); setError(""); setResult(null); setMeta(null); };
  const chooseSample = async () => {
    setPhase("preparing"); setError("");
    try { reset(await createSamplePackage()); }
    catch (sampleError) { setError(sampleError.message || "Unable to create sample package"); setPhase("error"); }
  };

  const analyze = async () => {
    if (!file) return;
    setPhase("uploading"); setError(""); setResult(null);
    try {
      if (!(file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf"))) throw new Error("Only PDF files are supported");
      if (file.size > 4 * 1024 * 1024) throw new Error("PDF must be 4 MB or smaller");
      const base64Source = await fileToBase64(file);
      const response = await fetch("/api/package-analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64Source, fileName: file.name, mimeType: "application/pdf" }) });
      const start = await response.json();
      if (!response.ok) throw new Error(start.error || "Unable to start package analysis");
      setMeta(start); setPhase("analyzing");

      for (let attempt = 0; attempt < 35; attempt += 1) {
        await wait(attempt < 3 ? 900 : 1500);
        const poll = await fetch(`/api/package-analysis?id=${encodeURIComponent(start.analysisId)}`);
        const payload = await poll.json();
        if (poll.status === 202) continue;
        if (!poll.ok) throw new Error(payload.error || "Package analysis failed");
        setResult(payload.result); setPhase("complete"); return;
      }
      throw new Error("Package analysis is taking longer than expected. Try again shortly.");
    } catch (analysisError) {
      setError(analysisError.message || "Package analysis failed"); setPhase("error");
    }
  };

  const tone = result ? statusTone(result.package.status) : null;

  return <main style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...display }}>
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "end", flexWrap: "wrap", marginBottom: 16 }}>
        <div><div style={{ ...mono, color: C.blue, fontSize: 9, fontWeight: 800 }}>PACKAGE INTELLIGENCE · BETA</div><h1 style={{ margin: "5px 0 0", fontSize: 27 }}>Understand a combined mortgage package before QC.</h1><p style={{ color: C.sub, margin: "7px 0 0", maxWidth: 760, fontSize: 13 }}>Assay uses Azure Document Intelligence to read up to eight pages, classify page content, group consecutive pages into documents, extract package context, and determine whether a rule-profile candidate can be resolved safely.</p></div>
        <a href="/live" style={{ ...mono, color: C.blue, fontSize: 10.5, textDecoration: "none" }}>Open single-note analysis →</a>
      </div>

      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
        <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 8, padding: 11, fontSize: 11.5, marginBottom: 14 }}><b>Use sample documents only.</b> Current package scope is up to 8 pages and 4 MB. Unknown or low-confidence pages remain explicit review items; Assay does not silently assign them to a document type.</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
          <label style={{ border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: 18, cursor: "pointer" }}><input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(event) => reset(event.target.files?.[0] || null)} /><b>{file ? file.name : "Choose a combined sample mortgage package"}</b><br /><span style={{ color: C.sub, fontSize: 11 }}>{file ? `${(file.size / 1024).toFixed(1)} KB` : "PDF · up to 4 MB · first 8 pages analyzed"}</span></label>
          <div style={{ display: "grid", gap: 8 }}><Button secondary onClick={chooseSample} disabled={phase === "preparing"}>{phase === "preparing" ? "Creating…" : "Create 8-page sample"}</Button><Button onClick={analyze} disabled={!file || ["uploading", "analyzing", "preparing"].includes(phase)}>{phase === "uploading" ? "Uploading…" : phase === "analyzing" ? "Analyzing package…" : "Analyze package"}</Button></div>
        </div>
        {meta && <div style={{ ...mono, color: C.sub, fontSize: 10, marginTop: 10 }}>Provider: {meta.provider} · model {meta.modelId} · pages {meta.pageScope}</div>}
        {error && <div style={{ background: C.failSoft, color: C.fail, borderRadius: 8, padding: 11, fontSize: 12, marginTop: 12 }}><b>Package analysis unavailable:</b> {error}</div>}
      </section>

      {result && <>
        <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4,minmax(160px,1fr))", gap: 9 }}>
          {[
            ["Package status", result.package.status],
            ["Pages analyzed", result.package.pageCount],
            ["Documents found", result.package.documents.length],
            ["OCR quality", result.package.ocrQuality.label],
          ].map(([label, value]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 13 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>{label.toUpperCase()}</div><div style={{ ...(label === "Package status" ? tone : {}), display: label === "Package status" ? "inline-flex" : "block", borderRadius: 6, padding: label === "Package status" ? "4px 7px" : 0, marginTop: 6, fontSize: label === "Package status" ? 11 : 18, fontWeight: 800 }}>{value}</div></div>)}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,.7fr)", gap: 14, marginTop: 14, alignItems: "start" }}>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
            <div style={{ padding: "13px 15px", borderBottom: `1px solid ${C.line}` }}><b>Document inventory</b><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>Consecutive pages with the same classification are grouped into one package document.</div></div>
            {result.package.documents.map((doc) => <div key={doc.id} style={{ display: "grid", gridTemplateColumns: "70px minmax(220px,1fr) 110px 100px", gap: 10, alignItems: "center", padding: "12px 15px", borderBottom: `1px solid ${C.line}`, fontSize: 11.5 }}><span style={mono}>{doc.id}</span><span><b>{doc.type}</b><br /><span style={{ color: C.sub, fontSize: 10 }}>{doc.evidence?.excerpt}</span></span><span>Pages {doc.startPage}{doc.endPage !== doc.startPage ? `–${doc.endPage}` : ""}</span><span style={{ ...mono, color: doc.confidence < 0.7 ? C.review : C.teal }}>{doc.confidence.toFixed(2)} conf.</span></div>)}
          </div>

          <aside style={{ display: "grid", gap: 10 }}>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>PACKAGE CONTEXT</div>{[
              ["Loan number", result.context.loanNumber || "Needs review"],
              ["Borrowers", result.context.borrowers.join("; ") || "Not extracted"],
              ["Jurisdiction", result.context.jurisdiction.code || "Needs context"],
              ["Context basis", result.context.jurisdiction.basis],
            ].map(([label, value]) => <div key={label} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><span style={{ color: C.sub }}>{label}</span><br /><b>{value}</b></div>)}</div>
            <div style={{ background: result.context.profileResolution.requiresHumanConfirmation ? C.reviewSoft : C.tealSoft, color: result.context.profileResolution.requiresHumanConfirmation ? C.review : C.teal, borderRadius: 10, padding: 14, fontSize: 11.5 }}><div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>PROFILE RESOLUTION</div><b style={{ display: "block", marginTop: 5 }}>{result.context.profileResolution.status}</b><div style={{ marginTop: 4 }}>Jurisdiction: {result.context.profileResolution.jurisdiction || "unresolved"}{result.context.profileResolution.requiresHumanConfirmation ? " · human confirmation required" : " · high-confidence package evidence"}</div></div>
            {(result.package.unknownPages.length > 0 || result.package.lowConfidencePages.length > 0) && <div style={{ background: C.reviewSoft, color: C.review, borderRadius: 10, padding: 12, fontSize: 11 }}>Review pages: {[...new Set([...result.package.unknownPages, ...result.package.lowConfidencePages])].join(", ")}.</div>}
          </aside>
        </section>

        <div style={{ marginTop: 14, background: C.blueSoft, color: C.blue, borderRadius: 10, padding: 12, fontSize: 11.5 }}><b>Current milestone boundary:</b> Package Intelligence stops here. The next connection is to pin the resolved profile, generate package-level QC controls, and hand the package into the existing evidence-backed review workspace.</div>
      </>}
    </div>
  </main>;
}

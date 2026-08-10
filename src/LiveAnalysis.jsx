import React, { useMemo, useState } from "react";
import PdfEvidenceViewer from "./PdfEvidenceViewer.jsx";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", pass: "#177245", passSoft: "#e8f4ed",
  fail: "#ad312b", failSoft: "#fae9e7", review: "#93620a", reviewSoft: "#f8efd9",
  blue: "#215f87", blueSoft: "#e8f1f7",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

function tone(status) {
  if (status === "Pass") return { color: C.pass, background: C.passSoft };
  if (status === "Fail") return { color: C.fail, background: C.failSoft };
  return { color: C.review, background: C.reviewSoft };
}

function Pill({ children, status }) {
  return <span style={{ ...mono, ...tone(status), display: "inline-flex", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800 }}>{children}</span>;
}

function Button({ children, onClick, disabled, secondary = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ ...display, border: secondary ? `1px solid ${C.line}` : 0, background: disabled ? "#e8ecea" : secondary ? C.panel : C.teal, color: disabled ? "#84918c" : secondary ? C.ink : "white", borderRadius: 8, padding: "10px 14px", fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

async function makeSyntheticNote() {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const page1 = pdf.addPage([612, 792]);
  const page2 = pdf.addPage([612, 792]);

  page1.drawText("PROMISSORY NOTE", { x: 220, y: 735, size: 16, font: bold });
  page1.drawText("Loan No.: LN-900001", { x: 54, y: 700, size: 10, font: regular });
  page1.drawText("Date: August 9, 2026", { x: 420, y: 700, size: 10, font: regular });
  const lines = [
    'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")',
    'promise to pay to Assay Demo Lending, Inc. ("Lender") the principal sum of',
    'THREE HUNDRED TWENTY-FIVE THOUSAND DOLLARS ($325,000.00),',
    'with interest on the unpaid principal balance at 6.250% annually.',
    '',
    'Property Address: 7408 Willow Bend Drive, Plano, Texas 75024',
    'Maturity Date: September 1, 2056',
    '',
    'This Note is secured by a Mortgage or Deed of Trust dated the same day.',
    'Borrower acknowledges receipt of a completed copy of this Promissory Note.',
  ];
  lines.forEach((line, index) => page1.drawText(line, { x: 54, y: 650 - index * 20, size: 10.5, font: regular }));
  page1.drawText("Synthetic portfolio-demo document. Not a legal instrument.", { x: 54, y: 50, size: 9, font: italic });

  page2.drawText("BORROWER EXECUTION", { x: 54, y: 735, size: 13, font: bold });
  page2.drawText("Loan No.: LN-900001", { x: 54, y: 700, size: 10, font: regular });
  page2.drawText("Execution Date: August 9, 2026", { x: 54, y: 680, size: 10, font: regular });
  page2.drawText("Borrower: Maya Patel", { x: 54, y: 620, size: 11, font: regular });
  page2.drawText("Maya Patel", { x: 78, y: 585, size: 15, font: italic });
  page2.drawLine({ start: { x: 54, y: 578 }, end: { x: 245, y: 578 } });
  page2.drawText("Signature", { x: 54, y: 562, size: 9, font: regular });
  page2.drawText("Borrower: Rohan Patel", { x: 54, y: 515, size: 11, font: regular });
  page2.drawText("Rohan Patel", { x: 78, y: 480, size: 15, font: italic });
  page2.drawLine({ start: { x: 54, y: 473 }, end: { x: 245, y: 473 } });
  page2.drawText("Signature", { x: 54, y: 457, size: 9, font: regular });
  page2.drawText("Synthetic portfolio-demo document. Not a legal instrument.", { x: 54, y: 50, size: 9, font: italic });

  const bytes = await pdf.save();
  return new File([bytes], "synthetic-promissory-note.pdf", { type: "application/pdf" });
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function LiveAnalysis() {
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);
  const [result, setResult] = useState(null);
  const [activeRuleId, setActiveRuleId] = useState(null);

  const activeRule = useMemo(
    () => result?.rules?.find((rule) => rule.id === activeRuleId) || result?.rules?.[0] || null,
    [result, activeRuleId],
  );

  const resetAnalysis = (nextFile) => {
    setFile(nextFile);
    setResult(null);
    setMeta(null);
    setActiveRuleId(null);
    setError("");
    setPhase("idle");
  };

  const chooseSample = async () => {
    setPhase("preparing");
    try {
      resetAnalysis(await makeSyntheticNote());
    } catch (sampleError) {
      setError(sampleError.message || "Unable to create sample PDF");
      setPhase("error");
    }
  };

  const analyze = async () => {
    if (!file) return;
    setPhase("uploading");
    setError("");
    setResult(null);
    setActiveRuleId(null);
    try {
      const looksLikePdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
      if (!looksLikePdf) throw new Error("Only PDF files are supported");
      if (file.size > 4 * 1024 * 1024) throw new Error("PDF must be 4 MB or smaller");
      const base64Source = await fileToBase64(file);
      const startResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Source, fileName: file.name, mimeType: "application/pdf", size: file.size }),
      });
      const start = await startResponse.json();
      if (!startResponse.ok) throw new Error(start.error || "Unable to start analysis");
      setMeta(start);
      setPhase("analyzing");

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await wait(attempt < 3 ? 900 : 1500);
        const response = await fetch(`/api/analysis?id=${encodeURIComponent(start.analysisId)}`);
        const payload = await response.json();
        if (response.status === 202) continue;
        if (!response.ok) throw new Error(payload.error || "Analysis failed");
        setResult(payload.result);
        setActiveRuleId(payload.result?.rules?.[0]?.id || null);
        setPhase("complete");
        return;
      }
      throw new Error("Analysis is taking longer than expected. Try again shortly.");
    } catch (analysisError) {
      setError(analysisError.message || "Analysis failed");
      setPhase("error");
    }
  };

  return <main style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...display, padding: 24 }}>
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <a href="/" style={{ ...mono, color: C.teal, textDecoration: "none", fontSize: 11 }}>← return to portfolio demo</a>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, flexWrap: "wrap", margin: "16px 0" }}>
        <div><h1 style={{ margin: 0, fontSize: 26 }}>Live Promissory Note analysis</h1><p style={{ color: C.sub, marginBottom: 0 }}>PDF → Azure OCR/layout → normalized fields → deterministic QC controls → source evidence.</p></div>
        <Pill status="Needs Review">BETA · 2-PAGE SCOPE</Pill>
      </div>

      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
        <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 8, padding: 11, fontSize: 12, marginBottom: 14 }}><b>Use synthetic documents only.</b> Uploaded PDFs are sent directly to Azure Document Intelligence for analysis and are not persisted by Assay. The first workflow reads pages 1–2 only.</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
          <label style={{ border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: 18, cursor: "pointer" }}>
            <input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(event) => resetAnalysis(event.target.files?.[0] || null)} />
            <b>{file ? file.name : "Choose a synthetic Promissory Note PDF"}</b><br /><span style={{ color: C.sub, fontSize: 11 }}>{file ? `${(file.size / 1024).toFixed(1)} KB` : "PDF · up to 4 MB · first two pages analyzed"}</span>
          </label>
          <div style={{ display: "grid", gap: 8 }}><Button onClick={chooseSample} secondary disabled={phase === "preparing"}>{phase === "preparing" ? "Creating…" : "Create sample PDF"}</Button><Button onClick={analyze} disabled={!file || ["uploading", "analyzing", "preparing"].includes(phase)}>{phase === "uploading" ? "Uploading…" : phase === "analyzing" ? "Analyzing…" : "Analyze document"}</Button></div>
        </div>
        {meta && <div style={{ ...mono, color: C.sub, fontSize: 10, marginTop: 10 }}>Provider: {meta.provider} · model {meta.modelId} · API {meta.apiVersion} · pages {meta.pageScope}</div>}
        {error && <div style={{ background: C.failSoft, color: C.fail, borderRadius: 8, padding: 11, fontSize: 12, marginTop: 12 }}><b>Analysis unavailable:</b> {error}{error.includes("not configured") && <><br />Add the two Azure environment variables to the Vercel Preview deployment, then redeploy.</>}</div>}
      </section>

      {result && <>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, margin: "16px 0" }}>
          {[["Document type", result.document.type], ["Loan number", result.document.loanNumber || "Not found"], ["Borrowers", result.document.borrowers.join("; ") || "Not found"], ["Execution date", result.document.executionDate || "Not found"], ["Pages analyzed", result.document.pageCount], ["OCR quality", result.document.ocrQuality.label]].map(([label, value]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 13 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>{label.toUpperCase()}</div><div style={{ fontWeight: 800, marginTop: 5, fontSize: 13 }}>{value}</div></div>)}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(440px,1.15fr) minmax(390px,.85fr)", gap: 14, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 12 }}>
            <PdfEvidenceViewer file={file} evidence={activeRule?.evidence} />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <div><b>QC findings</b><div style={{ color: C.sub, fontSize: 11 }}>Select a finding to inspect its source evidence.</div></div>
              <span style={{ ...mono, color: C.sub, fontSize: 10 }}>{result.rules.length} controls</span>
            </div>
            <section style={{ display: "grid", gap: 10 }}>
              {result.rules.map((rule) => {
                const selected = activeRule?.id === rule.id;
                return <article key={rule.id} style={{ background: C.panel, border: `1px solid ${selected ? tone(rule.status).color : `${tone(rule.status).color}55`}`, borderLeft: `4px solid ${tone(rule.status).color}`, boxShadow: selected ? `0 0 0 2px ${tone(rule.status).color}18` : "none", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><span style={{ ...mono, fontSize: 10, color: C.sub }}>{rule.id}</span> · <b>{rule.name}</b></div><Pill status={rule.status}>{rule.status}</Pill></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}><div style={{ background: C.bg, padding: 10, borderRadius: 8, fontSize: 11 }}><span style={{ color: C.sub }}>Extracted result</span><br /><b>{rule.extractedValue}</b></div><div style={{ background: C.bg, padding: 10, borderRadius: 8, fontSize: 11 }}><span style={{ color: C.sub }}>Evidence</span><br /><b>Page {rule.evidence.page}</b> · {rule.evidence.excerpt}</div></div>
                  <div style={{ ...mono, color: C.sub, fontSize: 10, marginTop: 9 }}>Classification {rule.confidence.classification?.toFixed(2) || "—"} · Extraction {rule.confidence.extraction?.toFixed(2) || "—"} · OCR {rule.confidence.ocrQuality} · Evidence {rule.confidence.evidenceComplete ? "complete" : "incomplete"}</div>
                  {rule.confidence.reviewTrigger && <div style={{ color: C.review, fontSize: 11, marginTop: 7 }}>Human review trigger: {rule.confidence.reviewTrigger}</div>}
                  <button type="button" onClick={() => setActiveRuleId(rule.id)} style={{ marginTop: 10, border: `1px solid ${C.line}`, background: selected ? C.tealSoft : C.panel, color: C.teal, borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{selected ? "Evidence selected" : `View evidence on page ${rule.evidence.page}`}</button>
                </article>;
              })}
            </section>
          </div>
        </section>
      </>}
    </div>
  </main>;
}

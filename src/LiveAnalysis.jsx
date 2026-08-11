import React, { useMemo, useState } from "react";
import PdfEvidenceViewer from "./PdfEvidenceViewer.jsx";
import { createLiveQcReview } from "./domain/liveQcCase.js";
import { saveLiveCaseSession } from "./sessionLiveCase.js";

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
function ExperienceMode() {
  return <div style={{ display: "grid", justifyItems: "end", gap: 4 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>EXPERIENCE MODE</div><div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, padding: 3, background: C.bg }}><a href="/" style={{ ...mono, textDecoration: "none", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, color: C.sub }}>Demo Workspace</a><a href="/live" style={{ ...mono, textDecoration: "none", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, color: C.teal, background: C.tealSoft }}>Live Analysis</a></div><div style={{ color: C.sub, fontSize: 10 }}>Live Azure pipeline · use sample documents only</div></div>;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
async function fileHash(file) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16)}…`;
  } catch {
    return "Session source";
  }
}
async function makeSampleNote() {
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
  [
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
  ].forEach((line, index) => page1.drawText(line, { x: 54, y: 650 - index * 20, size: 10.5, font: regular }));
  page1.drawText("Sample portfolio document. Not a legal instrument.", { x: 54, y: 50, size: 9, font: italic });
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
  page2.drawText("Sample portfolio document. Not a legal instrument.", { x: 54, y: 50, size: 9, font: italic });
  return new File([await pdf.save()], "sample-promissory-note.pdf", { type: "application/pdf" });
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default function LiveAnalysis() {
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);
  const [result, setResult] = useState(null);
  const [activeRuleId, setActiveRuleId] = useState(null);
  const [channel, setChannel] = useState("QC_ONLY");
  const [lastBase64, setLastBase64] = useState("");
  const activeRule = useMemo(() => result?.rules?.find((rule) => rule.id === activeRuleId) || result?.rules?.[0] || null, [result, activeRuleId]);

  const resetAnalysis = (nextFile) => { setFile(nextFile); setResult(null); setMeta(null); setActiveRuleId(null); setError(""); setLastBase64(""); setPhase("idle"); };
  const chooseSample = async () => {
    setPhase("preparing");
    try { resetAnalysis(await makeSampleNote()); }
    catch (sampleError) { setError(sampleError.message || "Unable to create sample PDF"); setPhase("error"); }
  };
  const analyze = async () => {
    if (!file) return;
    setPhase("uploading"); setError(""); setResult(null); setActiveRuleId(null);
    try {
      const looksLikePdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
      if (!looksLikePdf) throw new Error("Only PDF files are supported");
      if (file.size > 4 * 1024 * 1024) throw new Error("PDF must be 4 MB or smaller");
      const base64Source = await fileToBase64(file);
      setLastBase64(base64Source);
      const startResponse = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64Source, fileName: file.name, mimeType: "application/pdf", size: file.size }) });
      const start = await startResponse.json();
      if (!startResponse.ok) throw new Error(start.error || "Unable to start analysis");
      setMeta(start); setPhase("analyzing");
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await wait(attempt < 3 ? 900 : 1500);
        const response = await fetch(`/api/analysis?id=${encodeURIComponent(start.analysisId)}`);
        const payload = await response.json();
        if (response.status === 202) continue;
        if (!response.ok) throw new Error(payload.error || "Analysis failed");
        setResult(payload.result); setActiveRuleId(payload.result?.rules?.find((rule) => rule.status !== "Pass")?.id || payload.result?.rules?.[0]?.id || null); setPhase("complete"); return;
      }
      throw new Error("Analysis is taking longer than expected. Try again shortly.");
    } catch (analysisError) { setError(analysisError.message || "Analysis failed"); setPhase("error"); }
  };
  const createCase = async () => {
    if (!result || !file) return;
    const review = createLiveQcReview({ result, meta, channel, documentHash: await fileHash(file) });
    saveLiveCaseSession({ review, pdfBase64: lastBase64 || await fileToBase64(file), fileName: file.name });
    window.location.assign(`/?case=${encodeURIComponent(review.id)}`);
  };

  return <main style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...display }}>
    <header style={{ background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "12px 22px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><a href="/" style={{ display: "flex", gap: 10, alignItems: "center", color: C.ink, textDecoration: "none" }}><div style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: C.teal, color: "white", fontWeight: 800 }}>AY</div><div><b>Assay</b><div style={{ ...mono, color: C.sub, fontSize: 10 }}>post-execution mortgage QC</div></div></a><ExperienceMode /></header>
    <div style={{ maxWidth: 1480, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, flexWrap: "wrap", marginBottom: 16 }}><div><h1 style={{ margin: 0, fontSize: 26 }}>Live Analysis</h1><p style={{ color: C.sub, marginBottom: 0 }}>Analyze a sample PDF, then create a QC case in the same Package Review workflow.</p></div><Pill status="Needs Review">BETA · 2-PAGE NOTE SCOPE</Pill></div>
      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
        <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 8, padding: 11, fontSize: 12, marginBottom: 14 }}><b>Use sample documents only.</b> PDFs are sent to Azure Document Intelligence and are not persisted by Assay. The PDF is retained only in this browser session so Package Review can show source evidence.</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px auto", gap: 12, alignItems: "center" }}>
          <label style={{ border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: 18, cursor: "pointer" }}><input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(event) => resetAnalysis(event.target.files?.[0] || null)} /><b>{file ? file.name : "Choose a sample Promissory Note PDF"}</b><br /><span style={{ color: C.sub, fontSize: 11 }}>{file ? `${(file.size / 1024).toFixed(1)} KB` : "PDF · up to 4 MB · first two pages analyzed"}</span></label>
          <label style={{ display: "grid", gap: 5, fontSize: 11 }}>Intake channel<select value={channel} onChange={(event) => setChannel(event.target.value)} style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel }}><option value="RON">RON</option><option value="MOBILE_NOTARY">Mobile Notary</option><option value="QC_ONLY">QC Only</option></select></label>
          <div style={{ display: "grid", gap: 8 }}><Button onClick={chooseSample} secondary disabled={phase === "preparing"}>{phase === "preparing" ? "Creating…" : "Create sample PDF"}</Button><Button onClick={analyze} disabled={!file || ["uploading", "analyzing", "preparing"].includes(phase)}>{phase === "uploading" ? "Uploading…" : phase === "analyzing" ? "Analyzing…" : "Analyze document"}</Button></div>
        </div>
        {meta && <div style={{ ...mono, color: C.sub, fontSize: 10, marginTop: 10 }}>Provider: {meta.provider} · model {meta.modelId} · API {meta.apiVersion} · pages {meta.pageScope}</div>}
        {error && <div style={{ background: C.failSoft, color: C.fail, borderRadius: 8, padding: 11, fontSize: 12, marginTop: 12 }}><b>Analysis unavailable:</b> {error}</div>}
      </section>

      {result && <>
        <section style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", margin: "16px 0 10px", background: C.tealSoft, border: `1px solid ${C.teal}33`, borderRadius: 10, padding: 13, flexWrap: "wrap" }}><div><b style={{ color: C.teal }}>Analysis complete.</b><div style={{ color: C.sub, fontSize: 11, marginTop: 3 }}>Create a QC case to continue with human review, override/correction actions, final disposition, and audit history.</div></div><Button onClick={createCase}>Create QC case & review →</Button></section>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 16 }}>{[["Document type", result.document.type], ["Loan number", result.document.loanNumber || "Not found"], ["Borrowers", result.document.borrowers.join("; ") || "Not found"], ["Execution date", result.document.executionDate || "Not found"], ["Pages analyzed", result.document.pageCount], ["OCR quality", result.document.ocrQuality.label]].map(([label, value]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 13 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>{label.toUpperCase()}</div><div style={{ fontWeight: 800, marginTop: 5, fontSize: 13 }}>{value}</div></div>)}</section>
        <section style={{ display: "grid", gridTemplateColumns: "minmax(440px,1.15fr) minmax(390px,.85fr)", gap: 14, alignItems: "start" }}><div style={{ position: "sticky", top: 12 }}><PdfEvidenceViewer file={file} evidence={activeRule?.evidence} /></div><div><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}><div><b>QC findings</b><div style={{ color: C.sub, fontSize: 11 }}>Preview the live findings before creating the case.</div></div><span style={{ ...mono, color: C.sub, fontSize: 10 }}>{result.rules.length} controls</span></div><section style={{ display: "grid", gap: 10 }}>{result.rules.map((rule) => { const selected = activeRule?.id === rule.id; return <article key={rule.id} style={{ background: C.panel, border: `1px solid ${selected ? tone(rule.status).color : `${tone(rule.status).color}55`}`, borderLeft: `4px solid ${tone(rule.status).color}`, borderRadius: 10, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><span style={{ ...mono, fontSize: 10, color: C.sub }}>{rule.id}</span> · <b>{rule.name}</b></div><Pill status={rule.status}>{rule.status}</Pill></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}><div style={{ background: C.bg, padding: 10, borderRadius: 8, fontSize: 11 }}><span style={{ color: C.sub }}>Extracted result</span><br /><b>{rule.extractedValue}</b></div><div style={{ background: C.bg, padding: 10, borderRadius: 8, fontSize: 11 }}><span style={{ color: C.sub }}>Evidence</span><br /><b>Page {rule.evidence.page}</b> · {rule.evidence.excerpt}</div></div>{rule.confidence.reviewTrigger && <div style={{ color: C.review, fontSize: 11, marginTop: 7 }}>Human review trigger: {rule.confidence.reviewTrigger}</div>}<button type="button" onClick={() => setActiveRuleId(rule.id)} style={{ marginTop: 10, border: `1px solid ${C.line}`, background: selected ? C.tealSoft : C.panel, color: C.teal, borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{selected ? "Evidence selected" : `View evidence on page ${rule.evidence.page}`}</button></article>; })}</section></div></section>
      </>}
    </div>
  </main>;
}

import React, { useMemo, useState } from "react";
import { applyEvidenceCorrection, getCorrectionFieldConfig } from "./domain/humanCorrection.js";
import { canRecordReadyDisposition, computeRecommendation } from "./domain/mortgageQc.js";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", review: "#93620a", reviewSoft: "#f8efd9",
  fail: "#ad312b", failSoft: "#fae9e7", blue: "#215f87", blueSoft: "#e8f1f7", purple: "#534aa2", purpleSoft: "#eeecf8",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

const CASES = {
  borrowerNames: {
    tab: "Borrower name",
    title: "Borrower-name extraction conflict",
    helper: "Correct an OCR/extraction error against the pinned borrower evidence.",
    rule: {
      id: "NAME-001", name: "Borrower names consistent", severity: "Critical", fundingCritical: true, status: "Needs Review",
      requirement: "Borrower names must normalize to the same legal names across executed documents.",
      extractedValue: "Maya Pate1; Rohan Patel",
      evidence: { sourceDocument: "Signature/Name Affidavit", page: 1, excerpt: "Maya Patel and Rohan Patel", location: "borrower names" },
      confidence: { classification: 0.98, extraction: 0.71, ocrQuality: "High", evidenceComplete: true, reviewTrigger: "Extracted borrower name conflicts with pinned reference evidence" },
      correctableField: "borrowerNames",
      correctionContext: { referenceValue: "Maya Patel; Rohan Patel", referenceLabel: "Pinned borrower reference" },
    },
  },
  executionDate: {
    tab: "Execution date",
    title: "Execution-date extraction conflict",
    helper: "Correct a misread date, then let the deterministic date control rerun.",
    rule: {
      id: "DATE-001", name: "Execution date matches package context", severity: "Major", fundingCritical: true, status: "Needs Review",
      requirement: "The extracted execution date must match the pinned executed-document evidence used by this profile.",
      extractedValue: "2026-08-08",
      evidence: { sourceDocument: "Promissory Note", page: 1, excerpt: "Date: August 6, 2026", location: "execution date" },
      confidence: { classification: 0.99, extraction: 0.69, ocrQuality: "Medium", evidenceComplete: true, reviewTrigger: "Extracted date conflicts with source evidence" },
      correctableField: "executionDate",
      correctionContext: { referenceValue: "2026-08-06", referenceLabel: "Pinned execution-date reference" },
    },
  },
  documentClassification: {
    tab: "Document type",
    title: "Document-classification conflict",
    helper: "Correct the document type when the source is clear but classification is uncertain.",
    rule: {
      id: "DOC-CLASS-001", name: "Document type classified correctly", severity: "Major", fundingCritical: true, status: "Needs Review",
      requirement: "The page must be assigned to the correct document type before downstream rules can rely on it.",
      extractedValue: "Closing Disclosure",
      evidence: { sourceDocument: "Package page 1", page: 1, excerpt: "PROMISSORY NOTE · Loan No. LN-884188", location: "document heading" },
      confidence: { classification: 0.62, extraction: null, ocrQuality: "High", evidenceComplete: true, reviewTrigger: "Classification below routing threshold" },
      correctableField: "documentClassification",
      correctionContext: { referenceValue: "Promissory Note", referenceLabel: "Pinned document-type reference" },
    },
  },
};

function buildReview(type) {
  const config = CASES[type];
  return {
    id: `QC-HITL-${type === "borrowerNames" ? "001" : type === "executionDate" ? "002" : "003"}`,
    loanId: "LN-884188", borrower: "Maya & Rohan Patel", profile: { id: "MORTGAGE-QC-TX", version: "2.2.0" }, workflow: "In Review", disposition: null,
    rules: [structuredClone(config.rule)],
    audit: [
      { at: "09:03", actor: "System", action: "AI understanding completed", detail: `${config.rule.id} · ${config.rule.extractedValue}` },
      { at: "09:03", actor: "System", action: "Human review requested", detail: config.rule.confidence.reviewTrigger },
    ],
  };
}

function recommendationTone(value) {
  if (value === "Ready for Review") return { color: C.teal, background: C.tealSoft };
  if (value === "Exception Identified") return { color: C.fail, background: C.failSoft };
  return { color: C.review, background: C.reviewSoft };
}
function Pill({ children, tone }) {
  return <span style={{ ...mono, ...(tone || { color: C.sub, background: C.bg }), display: "inline-flex", borderRadius: 999, padding: "5px 8px", fontSize: 9.5, fontWeight: 800 }}>{children}</span>;
}

export default function HumanCorrectionDemo() {
  const [type, setType] = useState("borrowerNames");
  const [review, setReview] = useState(() => buildReview("borrowerNames"));
  const [value, setValue] = useState(review.rules[0].extractedValue);
  const [note, setNote] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const rule = review.rules[0];
  const field = getCorrectionFieldConfig(rule);
  const recommendation = useMemo(() => computeRecommendation(review.rules), [review]);
  const ready = canRecordReadyDisposition(review.rules);

  const chooseCase = (nextType) => {
    const next = buildReview(nextType);
    setType(nextType); setReview(next); setValue(next.rules[0].extractedValue); setNote(""); setLastResult(null);
  };
  const applyCorrection = () => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const { review: next, result } = applyEvidenceCorrection(review, { ruleId: rule.id, correctedValue: value, actor: "Analyst", note, at: now });
    setReview(next); setLastResult(result);
  };
  const reset = () => chooseCase(type);

  return <main style={{ ...display, minHeight: "100vh", background: C.bg, color: C.ink }}>
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "26px 24px 40px" }}>
      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 21 }}>
        <div style={{ ...mono, color: C.blue, fontSize: 9.5, fontWeight: 800 }}>HUMAN REVIEW · EVIDENCE-BACKED CORRECTION</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginTop: 7 }}>
          <div style={{ maxWidth: 760 }}><h1 style={{ margin: 0, fontSize: 27 }}>Correct the AI input, then rerun the control.</h1><p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.65, margin: "8px 0 0" }}>A correction changes extracted evidence; an override changes the human decision. Assay keeps those actions separate, preserves the original AI value, and shows the reviewer exactly what changed after re-evaluation.</p></div>
          <div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>PACKAGE RECOMMENDATION</div><Pill tone={recommendationTone(recommendation)}>{recommendation}</Pill></div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 15 }}>{Object.entries(CASES).map(([key, item]) => <button key={key} type="button" onClick={() => chooseCase(key)} style={{ ...mono, border: `1px solid ${type === key ? C.teal : C.line}`, background: type === key ? C.tealSoft : C.panel, color: type === key ? C.teal : C.sub, borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 10, fontWeight: 750 }}>{item.tab}</button>)}</div>
      </section>

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(330px,.8fr)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <article style={{ background: C.panel, border: `1px solid ${rule.status === "Pass" ? C.teal : C.review}`, borderLeft: `4px solid ${rule.status === "Pass" ? C.teal : C.review}`, borderRadius: 11, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><Pill>{rule.id}</Pill> <b>{CASES[type].title}</b></div><Pill tone={rule.status === "Pass" ? { color: C.teal, background: C.tealSoft } : { color: C.review, background: C.reviewSoft }}>{rule.status}</Pill></div>
            <p style={{ color: C.sub, fontSize: 11.5, lineHeight: 1.55 }}>{CASES[type].helper}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 9 }}>
              <div style={{ background: C.bg, borderRadius: 8, padding: 11 }}><div style={{ ...mono, color: C.sub, fontSize: 8.8 }}>CURRENT VALUE</div><b style={{ display: "block", marginTop: 5, fontSize: 12 }}>{rule.extractedValue}</b>{rule.aiExtractedValue && <div style={{ color: C.purple, fontSize: 10.5, marginTop: 6 }}>Original AI: {rule.aiExtractedValue}</div>}</div>
              <div style={{ background: C.bg, borderRadius: 8, padding: 11 }}><div style={{ ...mono, color: C.sub, fontSize: 8.8 }}>SOURCE EVIDENCE</div><b style={{ display: "block", marginTop: 5, fontSize: 12 }}>{rule.evidence.sourceDocument} · page {rule.evidence.page}</b><div style={{ color: C.sub, fontSize: 10.5, marginTop: 5 }}>{rule.evidence.excerpt}</div></div>
              <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 8, padding: 11 }}><div style={{ ...mono, fontSize: 8.8 }}>PINNED REFERENCE</div><b style={{ display: "block", marginTop: 5, fontSize: 12 }}>{rule.correctionContext.referenceValue}</b></div>
            </div>
          </article>

          {lastResult && <div style={{ background: lastResult.matchedReference ? C.tealSoft : C.reviewSoft, color: lastResult.matchedReference ? C.teal : C.review, borderRadius: 10, padding: 14, fontSize: 11.5, lineHeight: 1.55 }}><b>Re-evaluation complete.</b> {lastResult.fieldLabel}: AI “{lastResult.originalAiValue}” → human “{lastResult.correctedValue}”. Rule {lastResult.statusBefore} → {lastResult.statusAfter}. Package {lastResult.recommendationBefore} → {lastResult.recommendationAfter}. {lastResult.matchedReference ? "The blocker is cleared because the deterministic control now passes." : "The finding stays open because the correction still conflicts with pinned evidence."}</div>}

          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 15 }}><b>Audit history</b>{review.audit.map((event, index) => <div key={`${event.at}-${index}`} style={{ display: "grid", gridTemplateColumns: "62px 85px 1fr", gap: 9, padding: "9px 0", borderBottom: `1px solid ${C.line}`, fontSize: 10.5 }}><span style={mono}>{event.at}</span><b>{event.actor}</b><span>{event.action}<br /><span style={{ color: C.sub }}>{event.detail}</span></span></div>)}</div>
        </div>

        <aside style={{ position: "sticky", top: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 17 }}>
          <div style={{ ...mono, color: C.blue, fontSize: 9, fontWeight: 800 }}>REVIEW FINDING</div>
          <h2 style={{ fontSize: 18, margin: "7px 0" }}>Correct {field?.label.toLowerCase()}</h2>
          <p style={{ color: C.sub, fontSize: 11, lineHeight: 1.55 }}>Verify the source evidence, enter the corrected value, and rerun the impacted control. The original AI extraction remains in the audit record.</p>
          <label style={{ display: "grid", gap: 5, marginTop: 12, fontSize: 11.5 }}>Corrected value<input value={value} onChange={(event) => setValue(event.target.value)} style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 8, font: "inherit" }} /></label>
          <label style={{ display: "grid", gap: 5, marginTop: 10, fontSize: 11.5 }}>Analyst note <span style={{ color: C.sub, fontSize: 10 }}>(optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="What did you verify in the source?" style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 8, font: "inherit", resize: "vertical" }} /></label>
          <button type="button" disabled={!value.trim()} onClick={applyCorrection} style={{ width: "100%", marginTop: 12, border: 0, borderRadius: 8, padding: 10, background: value.trim() ? C.teal : "#dfe6e2", color: value.trim() ? "white" : C.sub, fontWeight: 800, cursor: value.trim() ? "pointer" : "not-allowed" }}>Apply correction & rerun control</button>
          <button type="button" onClick={reset} style={{ width: "100%", marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 8, padding: 9, background: C.panel, color: C.sub, cursor: "pointer" }}>Reset scenario</button>
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12, fontSize: 10.5, color: C.sub, lineHeight: 1.5 }}><b style={{ color: ready.allowed ? C.teal : C.review }}>Funding confirmation {ready.allowed ? "unblocked" : "blocked"}</b><br />A human correction only clears the blocker when the deterministic control passes.</div>
        </aside>
      </section>
    </div>
  </main>;
}

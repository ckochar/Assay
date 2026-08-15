import React, { useMemo, useState } from "react";
import { applyBorrowerNameCorrection } from "./domain/humanCorrection.js";
import { canRecordReadyDisposition, computeRecommendation } from "./domain/mortgageQc.js";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", review: "#93620a", reviewSoft: "#f8efd9",
  fail: "#ad312b", failSoft: "#fae9e7", blue: "#215f87", blueSoft: "#e8f1f7", purple: "#534aa2", purpleSoft: "#eeecf8",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

function initialReview() {
  return {
    id: "QC-HITL-001",
    loanId: "LN-884188",
    borrower: "Maya & Rohan Patel",
    profile: { id: "MORTGAGE-QC-TX", version: "2.2.0" },
    workflow: "In Review",
    disposition: null,
    rules: [{
      id: "NAME-001",
      name: "Borrower names consistent",
      severity: "Critical",
      fundingCritical: true,
      status: "Needs Review",
      requirement: "Borrower names must normalize to the same legal names across executed documents.",
      extractedValue: "Maya Pate1; Rohan Patel",
      evidence: { sourceDocument: "Signature/Name Affidavit", page: 1, excerpt: "Maya Patel and Rohan Patel", location: "borrower names" },
      confidence: { classification: 0.98, extraction: 0.71, ocrQuality: "High", evidenceComplete: true, reviewTrigger: "Extracted borrower name conflicts with pinned reference evidence" },
      correctableField: "borrowerNames",
      correctionContext: { referenceValue: "Maya Patel; Rohan Patel", referenceLabel: "Pinned borrower reference" },
    }],
    audit: [
      { at: "09:03", actor: "System", action: "AI extraction completed", detail: "NAME-001 · borrower value extracted as Maya Pate1; Rohan Patel" },
      { at: "09:03", actor: "System", action: "Human review requested", detail: "Borrower extraction conflicts with pinned reference evidence" },
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
  const [review, setReview] = useState(initialReview);
  const [value, setValue] = useState(review.rules[0].extractedValue);
  const [note, setNote] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const rule = review.rules[0];
  const recommendation = useMemo(() => computeRecommendation(review.rules), [review]);
  const ready = canRecordReadyDisposition(review.rules);

  const applyCorrection = () => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const { review: next, result } = applyBorrowerNameCorrection(review, {
      ruleId: rule.id,
      correctedValue: value,
      actor: "Analyst",
      note,
      at: now,
    });
    setReview(next);
    setLastResult(result);
  };

  const reset = () => {
    const next = initialReview();
    setReview(next);
    setValue(next.rules[0].extractedValue);
    setNote("");
    setLastResult(null);
  };

  return <main style={{ ...display, minHeight: "100vh", background: C.bg, color: C.ink }}>
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 40px" }}>
      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 21 }}>
        <div style={{ ...mono, color: C.blue, fontSize: 9.5, fontWeight: 800 }}>HUMAN-IN-THE-LOOP · CORRECTION + RE-EVALUATION</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginTop: 7 }}>
          <div style={{ maxWidth: 760 }}>
            <h1 style={{ margin: 0, fontSize: 27 }}>Correct AI evidence without bypassing the control.</h1>
            <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.65, margin: "8px 0 0" }}>The reviewer changes the extracted borrower value against source evidence. Assay preserves the original AI value, reruns the deterministic name-consistency rule, recomputes the package recommendation, and records the human action in audit history.</p>
          </div>
          <div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>PACKAGE RECOMMENDATION</div><Pill tone={recommendationTone(recommendation)}>{recommendation}</Pill></div>
        </div>
      </section>

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(330px,.85fr)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <article style={{ background: C.panel, border: `1px solid ${rule.status === "Pass" ? C.teal : C.review}`, borderLeft: `4px solid ${rule.status === "Pass" ? C.teal : C.review}`, borderRadius: 11, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><Pill>{rule.id}</Pill> <b>{rule.name}</b></div><Pill tone={rule.status === "Pass" ? { color: C.teal, background: C.tealSoft } : { color: C.review, background: C.reviewSoft }}>{rule.status}</Pill></div>
            <p style={{ color: C.sub, fontSize: 11.5, lineHeight: 1.55 }}>{rule.requirement}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              <div style={{ background: C.bg, borderRadius: 8, padding: 11 }}><div style={{ ...mono, color: C.sub, fontSize: 8.8 }}>CURRENT VALUE</div><b style={{ display: "block", marginTop: 5, fontSize: 12 }}>{rule.extractedValue}</b>{rule.aiExtractedValue && <div style={{ color: C.purple, fontSize: 10.5, marginTop: 6 }}>Original AI: {rule.aiExtractedValue}</div>}</div>
              <div style={{ background: C.bg, borderRadius: 8, padding: 11 }}><div style={{ ...mono, color: C.sub, fontSize: 8.8 }}>SOURCE EVIDENCE</div><b style={{ display: "block", marginTop: 5, fontSize: 12 }}>{rule.evidence.sourceDocument} · page {rule.evidence.page}</b><div style={{ color: C.sub, fontSize: 10.5, marginTop: 5 }}>{rule.evidence.excerpt}</div></div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}><Pill>Class {rule.confidence.classification.toFixed(2)}</Pill><Pill>Extract {rule.confidence.extraction.toFixed(2)}</Pill><Pill>OCR {rule.confidence.ocrQuality}</Pill></div>
          </article>

          {lastResult && <div style={{ background: lastResult.matchedReference ? C.tealSoft : C.reviewSoft, color: lastResult.matchedReference ? C.teal : C.review, borderRadius: 10, padding: 14, fontSize: 11.5, lineHeight: 1.55 }}><b>Re-evaluation complete.</b> Rule {lastResult.statusBefore} → {lastResult.statusAfter}. Package {lastResult.recommendationBefore} → {lastResult.recommendationAfter}. {lastResult.matchedReference ? "The corrected names match the pinned reference." : "The corrected value still conflicts with the pinned reference, so human review remains open."}</div>}

          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 15 }}>
            <b>Audit history</b>
            {review.audit.map((event, index) => <div key={`${event.at}-${index}`} style={{ display: "grid", gridTemplateColumns: "62px 85px 1fr", gap: 9, padding: "9px 0", borderBottom: `1px solid ${C.line}`, fontSize: 10.5 }}><span style={mono}>{event.at}</span><b>{event.actor}</b><span>{event.action}<br /><span style={{ color: C.sub }}>{event.detail}</span></span></div>)}
          </div>
        </div>

        <aside style={{ position: "sticky", top: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 17 }}>
          <div style={{ ...mono, color: C.blue, fontSize: 9, fontWeight: 800 }}>REVIEWER CORRECTION</div>
          <h2 style={{ fontSize: 18, margin: "7px 0" }}>Correct extracted borrower names</h2>
          <p style={{ color: C.sub, fontSize: 11, lineHeight: 1.55 }}>This action changes extracted evidence and reruns the rule. It is not an override or policy exception.</p>
          <label style={{ display: "grid", gap: 5, marginTop: 12, fontSize: 11.5 }}>Corrected value<input value={value} onChange={(event) => setValue(event.target.value)} style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 8, font: "inherit" }} /></label>
          <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 8, padding: 10, marginTop: 9, fontSize: 10.5 }}><b>Pinned reference</b><br />{rule.correctionContext.referenceValue}</div>
          <label style={{ display: "grid", gap: 5, marginTop: 10, fontSize: 11.5 }}>Analyst note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="What did you verify in the source?" style={{ padding: 10, border: `1px solid ${C.line}`, borderRadius: 8, font: "inherit", resize: "vertical" }} /></label>
          <button type="button" disabled={!value.trim()} onClick={applyCorrection} style={{ width: "100%", marginTop: 12, border: 0, borderRadius: 8, padding: 10, background: value.trim() ? C.teal : "#dfe6e2", color: value.trim() ? "white" : C.sub, fontWeight: 800, cursor: value.trim() ? "pointer" : "not-allowed" }}>Apply correction & rerun controls</button>
          <button type="button" onClick={reset} style={{ width: "100%", marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 8, padding: 9, background: C.panel, color: C.sub, cursor: "pointer" }}>Reset demo</button>
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12, fontSize: 10.5, color: C.sub, lineHeight: 1.5 }}><b style={{ color: ready.allowed ? C.teal : C.review }}>Funding confirmation {ready.allowed ? "unblocked" : "blocked"}</b><br />A corrected extraction only clears the blocker when the deterministic control passes.</div>
        </aside>
      </section>
    </div>
  </main>;
}

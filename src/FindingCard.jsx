import React, { useEffect, useMemo, useState } from "react";
import { getCorrectionFieldConfig, isCorrectableExtraction } from "./domain/humanCorrection.js";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", pass: "#177245", passSoft: "#e8f4ed",
  fail: "#ad312b", failSoft: "#fae9e7", review: "#93620a", reviewSoft: "#f8efd9",
  purple: "#534aa2", purpleSoft: "#eeecf8", blue: "#215f87", blueSoft: "#e8f1f7",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

function toneFor(status) {
  if (status === "Pass") return { color: C.pass, bg: C.passSoft, icon: "✓" };
  if (status === "Fail") return { color: C.fail, bg: C.failSoft, icon: "×" };
  if (status === "Needs Review") return { color: C.review, bg: C.reviewSoft, icon: "!" };
  return { color: C.sub, bg: C.bg, icon: "•" };
}

function Pill({ children, tone }) {
  const t = tone || { color: C.sub, bg: C.bg };
  return <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 750, color: t.color, background: t.bg, padding: "4px 8px", borderRadius: 6 }}>{children}</span>;
}

function ActionButton({ children, onClick, disabled, tone = "secondary" }) {
  const variants = {
    secondary: { background: C.panel, color: C.ink, border: `1px solid ${C.line}` },
    review: { background: C.reviewSoft, color: C.review, border: `1px solid ${C.review}44` },
    correction: { background: C.blueSoft, color: C.blue, border: `1px solid ${C.blue}44` },
    primary: { background: C.teal, color: "white", border: "1px solid transparent" },
  };
  const style = disabled ? { background: "#e9edeb", color: "#8a9691", border: "1px solid transparent" } : variants[tone];
  return <button type="button" disabled={disabled} onClick={onClick} style={{ ...display, ...style, borderRadius: 8, padding: "8px 11px", fontSize: 11, fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

function Confidence({ confidence = {} }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {[["Class", confidence.classification], ["Extract", confidence.extraction], ["OCR", confidence.ocrQuality]].map(([label, value]) => value != null && <Pill key={label}>{label} {typeof value === "number" ? value.toFixed(2) : value}</Pill>)}
    <Pill tone={confidence.evidenceComplete ? { color: C.pass, bg: C.passSoft } : { color: C.review, bg: C.reviewSoft }}>Evidence {confidence.evidenceComplete ? "complete" : "incomplete"}</Pill>
  </div>;
}

export default function FindingCard({
  rule,
  selected = false,
  isLive = false,
  disabled = false,
  onSelectEvidence,
  onOpenFinding,
  onApplyCorrection,
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rule.extractedValue || "");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState(null);
  const correctable = isCorrectableExtraction(rule);
  const field = useMemo(() => getCorrectionFieldConfig(rule), [rule.correctableField]);
  const ruleTone = toneFor(rule.status);

  useEffect(() => {
    setValue(rule.extractedValue || "");
    if (rule.status === "Pass") setEditing(false);
  }, [rule.extractedValue, rule.status]);

  const apply = () => {
    const result = onApplyCorrection?.(rule.id, value, note);
    if (result) {
      setFeedback(result);
      if (result.statusAfter === "Pass") setEditing(false);
    }
  };

  return <article style={{ background: C.panel, border: `1px solid ${selected ? ruleTone.color : `${ruleTone.color}44`}`, borderLeft: `4px solid ${ruleTone.color}`, borderRadius: 10, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div><Pill>{rule.id}</Pill> <b style={{ fontSize: 13 }}>{rule.name}</b> <span style={{ ...mono, fontSize: 9, color: rule.fundingCritical ? C.fail : C.sub }}>{rule.fundingCritical ? "FUNDING CRITICAL" : (rule.severity || "Major").toUpperCase()}</span></div>
      <Pill tone={ruleTone}>{ruleTone.icon} {rule.status}</Pill>
    </div>

    <p style={{ color: C.sub, fontSize: 11.5, margin: "9px 0" }}>{rule.requirement}</p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
      <div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 11 }}>
        <span style={{ color: C.sub }}>{rule.correctedByHuman ? "Current reviewed value" : "AI extracted result"}</span><br />
        <b>{rule.extractedValue}</b>
        {rule.aiExtractedValue && <div style={{ marginTop: 6, color: C.purple }}>Original AI: {rule.aiExtractedValue}</div>}
      </div>
      <div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 11 }}>
        <span style={{ color: C.sub }}>Source evidence</span><br />
        <b>{rule.evidence.sourceDocument} · page {rule.evidence.page}</b><br />
        <span>{rule.evidence.excerpt}</span>
      </div>
    </div>

    {editing && correctable && <div style={{ marginTop: 11, background: C.blueSoft, border: `1px solid ${C.blue}33`, borderRadius: 9, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <div style={{ ...mono, color: C.blue, fontSize: 9, fontWeight: 800 }}>CORRECT EXTRACTED VALUE</div>
          <div style={{ color: C.sub, fontSize: 10.5, marginTop: 4 }}>Verify the source evidence, correct only the extracted value, then rerun the deterministic control. This is not an override.</div>
        </div>
        <Pill tone={{ color: C.blue, bg: C.panel }}>{field?.label || "Correctable field"}</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(220px,.8fr)", gap: 10, marginTop: 10 }}>
        <label style={{ display: "grid", gap: 5, fontSize: 11 }}>Corrected value<input value={value} onChange={(event) => setValue(event.target.value)} style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7, font: "inherit" }} /></label>
        <div style={{ background: C.panel, borderRadius: 7, padding: 9, fontSize: 10.5 }}><span style={{ color: C.sub }}>{rule.correctionContext?.referenceLabel || "Pinned reference"}</span><br /><b>{rule.correctionContext?.referenceValue}</b></div>
      </div>
      <label style={{ display: "grid", gap: 5, marginTop: 9, fontSize: 11 }}>Analyst note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you verify in the source?" style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7, resize: "vertical", font: "inherit" }} /></label>
      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        <ActionButton tone="primary" disabled={!value.trim()} onClick={apply}>Apply correction & rerun</ActionButton>
        <ActionButton onClick={() => { setEditing(false); setValue(rule.extractedValue || ""); setNote(""); }}>Cancel</ActionButton>
      </div>
    </div>}

    {feedback && <div style={{ marginTop: 9, fontSize: 10.5, lineHeight: 1.5, color: feedback.matchedReference ? C.pass : C.review, background: feedback.matchedReference ? C.passSoft : C.reviewSoft, padding: 9, borderRadius: 7 }}><b>Re-evaluation complete.</b> Rule {feedback.statusBefore} → {feedback.statusAfter}; package {feedback.recommendationBefore} → {feedback.recommendationAfter}.</div>}

    <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Confidence confidence={rule.confidence} />
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {isLive && <ActionButton onClick={onSelectEvidence}>{selected ? "Evidence selected" : "View source evidence"}</ActionButton>}
        {correctable && rule.status !== "Pass" && !disabled && !editing && <ActionButton tone="correction" onClick={() => { setFeedback(null); setEditing(true); }}>Correct extracted value</ActionButton>}
        {rule.status !== "Pass" && !disabled && <ActionButton tone="review" onClick={() => onOpenFinding?.(rule)}>{correctable ? "Override / exception" : "Review finding"}</ActionButton>}
      </div>
    </div>

    {rule.correctedByHuman && <div style={{ marginTop: 9, fontSize: 10.5, color: C.blue, background: C.blueSoft, padding: 8, borderRadius: 7 }}>Human correction recorded. Original AI value is preserved in the audit trail.{rule.correctionNote ? ` · ${rule.correctionNote}` : ""}</div>}
    {rule.overridden && <div style={{ marginTop: 9, fontSize: 11, color: C.purple, background: C.purpleSoft, padding: 8, borderRadius: 7 }}>Original system result: {rule.originalStatus}. Human action: {rule.overrideReason}{rule.authorizedException ? " · authorized policy exception" : ""}{rule.overrideNote ? ` · ${rule.overrideNote}` : ""}.</div>}
  </article>;
}

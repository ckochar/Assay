import React, { useMemo, useState } from "react";
import {
  RECOMMENDATION,
  ROUTING_THRESHOLDS,
  canRecordReadyDisposition,
  computeRecommendation,
  validateOverride,
} from "./domain/mortgageQc.js";
import { DEMO_REVIEWS, PROFILE_REGISTRY } from "./data/mortgageDemo.js";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", pass: "#177245", passSoft: "#e8f4ed",
  fail: "#ad312b", failSoft: "#fae9e7", review: "#93620a", reviewSoft: "#f8efd9",
  blue: "#215f87", blueSoft: "#e8f1f7", purple: "#534aa2", purpleSoft: "#eeecf8",
  muted: "#eef2f0",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };
const channelLabel = { RON: "RON", MOBILE_NOTARY: "Mobile notary", QC_ONLY: "QC only" };

function statusStyle(status) {
  if (["Pass", RECOMMENDATION.READY, "Ready for Funding", "Completed"].includes(status)) return { color: C.pass, bg: C.passSoft, icon: "✓" };
  if (["Fail", RECOMMENDATION.EXCEPTION].includes(status)) return { color: C.fail, bg: C.failSoft, icon: "×" };
  if (["Needs Review", RECOMMENDATION.REVIEW, "Awaiting Correction"].includes(status)) return { color: C.review, bg: C.reviewSoft, icon: "!" };
  return { color: C.sub, bg: C.bg, icon: "•" };
}

function Pill({ children, tone }) {
  const style = tone || { color: C.sub, bg: C.bg };
  return <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: style.color, background: style.bg, padding: "4px 8px", borderRadius: 6 }}>{children}</span>;
}

function Button({ children, onClick, disabled, secondary = false, danger = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} style={{ ...display, border: secondary ? `1px solid ${C.line}` : "none", background: disabled ? "#e9edeb" : danger ? C.failSoft : secondary ? C.panel : C.teal, color: disabled ? "#8a9691" : danger ? C.fail : secondary ? C.ink : "white", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

function ExperienceMode({ active = "demo" }) {
  return <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>EXPERIENCE MODE</div>
    <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, padding: 3, background: C.bg }}>
      <a href="/" style={{ ...mono, textDecoration: "none", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, color: active === "demo" ? C.teal : C.sub, background: active === "demo" ? C.tealSoft : "transparent" }}>Demo Workspace</a>
      <a href="/live" style={{ ...mono, textDecoration: "none", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, color: active === "live" ? C.teal : C.sub, background: active === "live" ? C.tealSoft : "transparent" }}>Live Analysis</a>
    </div>
    <div style={{ color: C.sub, fontSize: 10 }}>Preloaded sample packages · portfolio prototype</div>
  </div>;
}

function Confidence({ confidence }) {
  const values = [["Class", confidence.classification], ["Extract", confidence.extraction], ["OCR", confidence.ocrQuality]];
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {values.map(([label, value]) => value != null && <Pill key={label}>{label} {typeof value === "number" ? value.toFixed(2) : value}</Pill>)}
    <Pill tone={confidence.evidenceComplete ? { color: C.pass, bg: C.passSoft } : { color: C.review, bg: C.reviewSoft }}>Evidence {confidence.evidenceComplete ? "complete" : "incomplete"}</Pill>
  </div>;
}

function AppHeader({ screen, setScreen }) {
  return <header style={{ background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
    <div onClick={() => setScreen("dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ ...display, width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: C.teal, color: "white", fontWeight: 800 }}>AY</div>
      <div><div style={{ ...display, fontWeight: 800 }}>Assay</div><div style={{ ...mono, color: C.sub, fontSize: 10 }}>post-execution mortgage QC</div></div>
    </div>
    <nav style={{ display: "flex", gap: 6 }}>
      {[["dashboard", "QC Dashboard"], ["profiles", "Rule Profiles"], ["governance", "AI Governance"]].map(([id, label]) => <button key={id} type="button" onClick={() => setScreen(id)} style={{ ...mono, border: `1px solid ${screen === id ? C.teal : C.line}`, color: screen === id ? C.teal : C.sub, background: screen === id ? C.tealSoft : C.panel, borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: 11 }}>{label}</button>)}
    </nav>
    <ExperienceMode active="demo" />
  </header>;
}

function packageLifecycle(review) {
  if (review.workflow === "Completed" && review.disposition) {
    return { label: review.disposition, helper: "Review completed", tone: statusStyle(review.disposition), open: false };
  }
  if (review.workflow === "Awaiting Correction") {
    return { label: "Awaiting Correction", helper: "Waiting for resubmission", tone: statusStyle("Awaiting Correction"), open: true };
  }
  const recommendation = computeRecommendation(review.rules);
  return {
    label: recommendation,
    helper: recommendation === RECOMMENDATION.READY ? "Verify and confirm" : recommendation === RECOMMENDATION.REVIEW ? "Human judgment required" : "Corrective action required",
    tone: statusStyle(recommendation),
    open: true,
  };
}

function PackageRow({ review, openReview, compact = false }) {
  const lifecycle = packageLifecycle(review);
  const pass = review.rules.filter((r) => r.status === "Pass").length;
  const fail = review.rules.filter((r) => r.status === "Fail" && !r.authorizedException).length;
  const needs = review.rules.filter((r) => r.status === "Needs Review" && !r.authorizedException).length;
  const pages = review.documents.reduce((sum, doc) => sum + doc.pages, 0);
  return <div onClick={() => openReview(review.id)} style={{ display: "grid", gridTemplateColumns: compact ? "88px minmax(220px,1.7fr) 130px 170px" : "88px minmax(220px,1.5fr) 105px 110px 185px 155px", gap: 10, alignItems: "center", padding: "13px 15px", borderBottom: `1px solid ${C.line}`, cursor: "pointer", fontSize: 12 }}>
    <span style={mono}>{review.id}</span>
    <span><b>{review.borrower}</b><br /><span style={{ color: C.sub }}>{review.loanId} · {pages} pages · {review.documents.length} docs</span></span>
    {!compact && <span>{channelLabel[review.channel]}</span>}
    {!compact && <span style={mono}>{review.jurisdiction} v{review.profile.version}</span>}
    <span><Pill tone={lifecycle.tone}>{lifecycle.tone.icon} {lifecycle.label}</Pill><br /><span style={{ color: C.sub, fontSize: 10 }}>{lifecycle.helper}</span></span>
    <span style={{ color: C.sub, fontSize: 10 }}>{pass} Pass · {fail} Fail · {needs} Review<br />{review.workflow}</span>
  </div>;
}

function HowAssayWorks() {
  const steps = [
    ["1", "Intake", "Receive an executed package through RON, Mobile Notary, QC Only, or upload."],
    ["2", "Understand", "OCR and AI classify documents, extract fields, and preserve source evidence."],
    ["3", "Apply Rules", "Assay selects the applicable rule profile and evaluates deterministic QC controls."],
    ["4", "Review", "Analysts inspect exceptions or uncertain evidence directly against the source."],
    ["5", "Dispose", "Confirm, override, return for correction, escalate, or record an authorized exception."],
  ];
  return <section style={{ marginTop: 22, background: C.muted, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
    <div style={{ marginBottom: 10 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>QUICK ORIENTATION</div><h2 style={{ ...display, margin: "3px 0 0", fontSize: 15 }}>How Assay works</h2><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>A lightweight overview for first-time users.</div></div>
    <div style={{ display: "flex", alignItems: "stretch", gap: 6, overflowX: "auto" }}>
      {steps.map(([n, title, body], index) => <React.Fragment key={n}>
        <div style={{ minWidth: 155, flex: 1, background: "#ffffffaa", border: `1px solid ${C.line}`, borderRadius: 9, padding: 11 }}><Pill tone={{ color: C.teal, bg: C.tealSoft }}>{n}</Pill><div style={{ fontWeight: 800, marginTop: 7, fontSize: 11.5 }}>{title}</div><div style={{ color: C.sub, fontSize: 10, lineHeight: 1.45, marginTop: 4 }}>{body}</div></div>
        {index < steps.length - 1 && <div aria-hidden="true" style={{ alignSelf: "center", color: "#9aa7a1", fontSize: 18, flex: "0 0 auto" }}>→</div>}
      </React.Fragment>)}
    </div>
  </section>;
}

function Dashboard({ reviews, openReview }) {
  const openReviews = reviews.filter((review) => packageLifecycle(review).open);
  const completedReviews = reviews.filter((review) => !packageLifecycle(review).open);
  const recommendations = openReviews.map((review) => computeRecommendation(review.rules));
  const kpis = [
    ["Open Reviews", openReviews.length],
    ["Ready for Review", recommendations.filter((item) => item === RECOMMENDATION.READY).length],
    ["Needs Review", recommendations.filter((item) => item === RECOMMENDATION.REVIEW).length],
    ["Exceptions", recommendations.filter((item) => item === RECOMMENDATION.EXCEPTION).length],
    ["Completed", completedReviews.length],
  ];
  return <main style={{ padding: 24, maxWidth: 1220, margin: "0 auto" }}>
    <div><h1 style={{ ...display, margin: 0, fontSize: 25 }}>QC Dashboard</h1><p style={{ color: C.sub, margin: "6px 0 0", fontSize: 13 }}>Overview of package QC status across RON, mobile-notary, and QC-only intake.</p></div>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, margin: "20px 0" }}>
      {kpis.map(([label, value]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 10, textTransform: "uppercase" }}>{label}</div><div style={{ ...display, fontSize: 22, fontWeight: 800, marginTop: 5 }}>{value}</div></div>)}
    </section>

    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
      <div style={{ padding: "13px 15px", borderBottom: `1px solid ${C.line}` }}><div style={{ fontWeight: 800 }}>Package Review Queue</div><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>Open packages are prioritized by what the analyst needs to do next.</div></div>
      {openReviews.length ? openReviews.map((review) => <PackageRow key={review.id} review={review} openReview={openReview} />) : <div style={{ padding: 18, color: C.sub, fontSize: 12 }}>No open packages. Completed reviews appear below.</div>}
    </section>

    {completedReviews.length > 0 && <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden", marginTop: 14 }}>
      <div style={{ padding: "12px 15px", borderBottom: `1px solid ${C.line}` }}><div style={{ fontWeight: 800 }}>Recently Completed</div><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>Final human dispositions; no further analyst action is required.</div></div>
      {completedReviews.map((review) => <PackageRow key={review.id} review={review} openReview={openReview} compact />)}
    </section>}

    <HowAssayWorks />
  </main>;
}

function TechnicalDetails({ active }) {
  return <details style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}>
    <summary style={{ cursor: "pointer", fontWeight: 750, fontSize: 11.5 }}>Technical details</summary>
    <div style={{ marginTop: 8 }}>{[["Profile", `${active.profile.id} v${active.profile.version}`], ["Profile effective", active.profile.effectiveAt], ["Document hash", active.evaluationContext.documentHash], ["Extractor", `${active.evaluationContext.extractorProvider} ${active.evaluationContext.extractorVersion}`], ["Processing mode", active.processing.mode]].map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 10.5 }}><span style={{ color: C.sub }}>{k}</span><span style={{ ...mono, textAlign: "right" }}>{v}</span></div>)}</div>
  </details>;
}

function ReviewScreen({ active, filter, setFilter, onBack, onOpenFinding, onReady, onReturn }) {
  const recommendation = computeRecommendation(active.rules);
  const readyCheck = canRecordReadyDisposition(active.rules);
  const tone = statusStyle(recommendation);
  const shown = active.rules.filter((rule) => filter === "All" || rule.status === filter);
  const isAwaitingCorrection = active.workflow === "Awaiting Correction";
  const isCompleted = active.workflow === "Completed" && Boolean(active.disposition);
  const totalPages = active.documents.reduce((sum, doc) => sum + doc.pages, 0);
  const unresolvedFails = active.rules.filter((r) => r.status === "Fail" && !r.authorizedException).length;
  const unresolvedReview = active.rules.filter((r) => r.status === "Needs Review" && !r.authorizedException).length;
  const actionText = recommendation === RECOMMENDATION.READY ? "No blockers found · review evidence and confirm the package." : recommendation === RECOMMENDATION.REVIEW ? `${unresolvedReview} uncertain finding requires human judgment.` : `${unresolvedFails} blocker requires corrective action.`;

  return <main style={{ padding: 20, maxWidth: 1280, margin: "0 auto" }}>
    <button type="button" onClick={onBack} style={{ ...mono, background: "none", border: 0, color: C.sub, cursor: "pointer" }}>← QC Dashboard</button>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap", margin: "12px 0" }}>
      <div><h1 style={{ ...display, margin: 0, fontSize: 22 }}>{active.borrower}</h1><div style={{ color: C.sub, fontSize: 12, marginTop: 5 }}>{active.loanId} · {channelLabel[active.channel]} · {active.jurisdiction} · {active.documents.length} documents · {totalPages} pages · QC profile v{active.profile.version}</div></div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>SYSTEM RECOMMENDATION</div><Pill tone={tone}>{tone.icon} {recommendation}</Pill></div><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>WORKFLOW</div><Pill tone={statusStyle(active.workflow)}>{active.workflow}</Pill></div><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>FINAL DISPOSITION</div><Pill tone={active.disposition ? statusStyle(active.disposition) : undefined}>{active.disposition || "Not recorded"}</Pill></div></div>
    </div>

    <div style={{ background: isCompleted ? C.passSoft : isAwaitingCorrection ? C.reviewSoft : tone.bg, color: isCompleted ? C.pass : isAwaitingCorrection ? C.review : tone.color, borderRadius: 9, padding: 11, fontSize: 12, marginBottom: 14 }}>
      <b>{isCompleted ? `Review completed · ${active.disposition}. No further action is required.` : isAwaitingCorrection ? "Package returned · awaiting corrected documents." : actionText}</b>
      {isAwaitingCorrection && <div style={{ marginTop: 4 }}>The current evaluation is retained in audit history. Final disposition is blocked until a corrected package is received and re-analyzed.</div>}
      {isCompleted && <div style={{ marginTop: 4 }}>The system recommendation and analyst actions remain visible below for traceability.</div>}
    </div>

    <section style={{ display: "grid", gridTemplateColumns: "minmax(260px,.8fr) minmax(500px,1.7fr)", gap: 14 }}>
      <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 750 }}>Package documents</div><div style={{ color: C.sub, fontSize: 10.5, margin: "3px 0 8px" }}>{active.documents.length} documents · {totalPages} total pages</div>
          {active.documents.map((doc) => <div key={doc.name} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><b>{doc.name}</b><br /><span style={{ color: C.sub }}>{doc.pages} pages · {doc.status}</span></div>)}
        </div>
        <TechnicalDetails active={active} />
        <div style={{ background: C.blueSoft, border: `1px solid ${C.blue}33`, borderRadius: 10, padding: 12 }}><b style={{ color: C.blue, fontSize: 11.5 }}>Demo Workspace</b><p style={{ fontSize: 10.5, lineHeight: 1.5, color: C.blue, marginBottom: 0 }}>This case uses preloaded sample package data. Switch to Live Analysis to process a sample PDF through Azure.</p></div>
      </aside>

      <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>{["All", "Fail", "Needs Review", "Pass"].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} style={{ ...mono, border: `1px solid ${filter === item ? C.teal : C.line}`, background: filter === item ? C.tealSoft : C.panel, color: filter === item ? C.teal : C.sub, borderRadius: 6, padding: "6px 9px", cursor: "pointer", fontSize: 10 }}>{item}</button>)}</div>
        <div style={{ display: "grid", gap: 9 }}>
          {shown.map((rule) => { const ruleTone = statusStyle(rule.status); return <article key={rule.id} style={{ background: C.panel, border: `1px solid ${ruleTone.color}44`, borderLeft: `4px solid ${ruleTone.color}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><Pill>{rule.id}</Pill> <b style={{ fontSize: 13 }}>{rule.name}</b> <span style={{ ...mono, fontSize: 9, color: rule.fundingCritical ? C.fail : C.sub }}>{rule.fundingCritical ? "FUNDING CRITICAL" : rule.severity.toUpperCase()}</span></div><Pill tone={ruleTone}>{ruleTone.icon} {rule.status}</Pill></div>
            <p style={{ color: C.sub, fontSize: 11.5, margin: "9px 0" }}>{rule.requirement}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 11 }}><span style={{ color: C.sub }}>Extracted result</span><br /><b>{rule.extractedValue}</b></div><div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 11 }}><span style={{ color: C.sub }}>Source evidence</span><br /><b>{rule.evidence.sourceDocument} · page {rule.evidence.page}</b><br /><span>{rule.evidence.excerpt}</span></div></div>
            <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><Confidence confidence={rule.confidence} />{rule.status !== "Pass" && !active.disposition && !isAwaitingCorrection && <Button secondary onClick={() => onOpenFinding(rule)}>Review finding</Button>}</div>
            {rule.overridden && <div style={{ marginTop: 9, fontSize: 11, color: C.purple, background: C.purpleSoft, padding: 8, borderRadius: 7 }}>Original system result: {rule.originalStatus}. Human action: {rule.overrideReason}{rule.authorizedException ? " · authorized policy exception" : ""}{rule.overrideNote ? ` · ${rule.overrideNote}` : ""}.</div>}
          </article>; })}
        </div>
        {!active.disposition && !isAwaitingCorrection && <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}><Button disabled={recommendation !== RECOMMENDATION.READY || !readyCheck.allowed} onClick={onReady}>Confirm Ready for Funding</Button><Button secondary onClick={onReturn} disabled={recommendation === RECOMMENDATION.READY}>Return for correction</Button></div>}
        {!readyCheck.allowed && !isAwaitingCorrection && !isCompleted && <div style={{ marginTop: 9, color: C.fail, fontSize: 11 }}>Funding confirmation blocked by {readyCheck.blockers.map((item) => item.id).join(", ")}. Resolve through evidence-backed review, an authorized exception, correction, or escalation.</div>}
        <div style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ fontWeight: 750 }}>Audit history</div>{active.audit.map((event, index) => <div key={`${event.at}-${index}`} style={{ display: "grid", gridTemplateColumns: "55px 105px 1fr", gap: 9, padding: "9px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><span style={mono}>{event.at}</span><b>{event.actor}</b><span>{event.action} · <span style={{ color: C.sub }}>{event.detail}</span></span></div>)}</div>
      </div>
    </section>
  </main>;
}

function ProfilesScreen() {
  return <main style={{ padding: 24, maxWidth: 950, margin: "0 auto" }}><h1 style={{ ...display }}>Published Rule Profiles</h1><p style={{ color: C.sub, fontSize: 13 }}>Assay resolves the applicable rule profile from jurisdiction and future loan, investor, client, and execution-channel overlays. Profile parameters are versioned data; reusable rule templates remain deterministic code.</p><div style={{ display: "grid", gap: 12 }}>{Object.values(PROFILE_REGISTRY).map((profile) => <div key={profile.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr repeat(4,120px)", gap: 10, alignItems: "center", fontSize: 12 }}><b>{profile.jurisdiction}</b><span style={mono}>{profile.id}</span><span>v{profile.version}</span><span>{profile.effectiveAt}</span><Pill tone={{ color: C.pass, bg: C.passSoft }}>{profile.status}</Pill></div>)}</div><div style={{ marginTop: 14, background: C.reviewSoft, color: C.review, borderRadius: 9, padding: 12, fontSize: 11 }}>Sample profiles are fictional and are not legal, compliance, investor, or underwriting guidance.</div></main>;
}

function GovernanceScreen({ reviews }) {
  const allRules = reviews.flatMap((review) => review.rules);
  const total = allRules.length;
  const overrides = allRules.filter((rule) => rule.overridden).length;
  const lowConfidence = allRules.filter((rule) => rule.confidence.reviewTrigger).length;
  return <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}><h1 style={{ ...display }}>AI Governance</h1><p style={{ color: C.sub, maxWidth: 780, fontSize: 13 }}>Confidence routes work; it does not determine the final business disposition. Current prototype thresholds route to human review when classification is below {ROUTING_THRESHOLDS.classification.toFixed(2)}, extraction is below {ROUTING_THRESHOLDS.extraction.toFixed(2)}, OCR quality is low, or required evidence is incomplete.</p><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, margin: "18px 0" }}>{[["Rule evaluations", total], ["Human overrides", overrides], ["Confidence routes", lowConfidence], ["False-ready release gate", "0"], ["Class threshold", ROUTING_THRESHOLDS.classification.toFixed(2)], ["Extract threshold", ROUTING_THRESHOLDS.extraction.toFixed(2)]].map(([k,v]) => <div key={k} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 10 }}>{k.toUpperCase()}</div><div style={{ ...display, fontSize: 22, fontWeight: 800, marginTop: 5 }}>{v}</div></div>)}</section><div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}><b>Routing policy</b><p style={{ color: C.sub, lineHeight: 1.6, fontSize: 12 }}>Low confidence produces <b>Needs Review</b>, not Fail. A Fail should come from deterministic evidence of a rule violation—for example, the expected borrower count is two but only one signature indicator is found. Thresholds are prototype defaults and should eventually be calibrated by field and risk tier using a labeled evaluation set.</p></div></main>;
}

function OverrideModal({ modal, override, setOverride, onApply, onClose }) {
  if (modal?.type !== "override") return null;
  const rule = modal.rule;
  const requiresApproval = rule.severity === "Critical" && override.authorizedException;
  const valid = Boolean(override.reason) && (!requiresApproval || override.secondApproval);
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#12211d88", display: "grid", placeItems: "center", zIndex: 20 }}><div onClick={(event) => event.stopPropagation()} style={{ width: "min(520px,92vw)", background: C.panel, borderRadius: 12, padding: 20 }}>
    <h2 style={{ ...display, marginTop: 0 }}>Review {rule.id}</h2><p style={{ color: C.sub, fontSize: 12 }}>System result: <b>{rule.status}</b>. Source evidence is pinned to {rule.evidence.sourceDocument}, page {rule.evidence.page}.</p>
    <label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Reason<select value={override.reason} onChange={(event) => setOverride((current) => ({ ...current, reason: event.target.value }))} style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7 }}><option value="">Select…</option><option>Extraction error</option><option>Evidence found elsewhere</option><option>Wrong document classification</option><option>Acceptable variation</option><option>Policy exception</option></select></label>
    <label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Analyst note<textarea rows={4} value={override.note} onChange={(event) => setOverride((current) => ({ ...current, note: event.target.value }))} placeholder="Describe what you verified in the source document…" style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7, resize: "vertical" }} /></label>
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, marginBottom: 10 }}><input type="checkbox" checked={override.authorizedException} onChange={(event) => setOverride((current) => ({ ...current, authorizedException: event.target.checked }))} />Record as formally authorized policy exception</label>
    {requiresApproval && <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.fail, marginBottom: 12 }}><input type="checkbox" checked={override.secondApproval} onChange={(event) => setOverride((current) => ({ ...current, secondApproval: event.target.checked }))} />QC manager second approval</label>}
    <div style={{ display: "flex", gap: 8 }}><Button disabled={!valid} onClick={onApply}>Record evidence-backed action</Button><Button secondary onClick={onClose}>Cancel</Button></div>
  </div></div>;
}

export default function App() {
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [screen, setScreen] = useState("dashboard");
  const [activeId, setActiveId] = useState(DEMO_REVIEWS[0].id);
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [override, setOverride] = useState({ reason: "", note: "", authorizedException: false, secondApproval: false });
  const active = useMemo(() => reviews.find((review) => review.id === activeId) || reviews[0], [reviews, activeId]);

  const openReview = (id) => { setActiveId(id); setFilter("All"); setScreen("review"); };
  const updateActive = (fn) => setReviews((items) => items.map((review) => review.id === active.id ? fn(structuredClone(review)) : review));
  const openFinding = (rule) => { setModal({ type: "override", rule }); setOverride({ reason: "", note: "", authorizedException: false, secondApproval: false }); };

  const applyOverride = () => {
    const rule = modal.rule;
    const evidence = rule.evidence;
    const validation = validateOverride({ actor: { id: "sample-analyst", permissions: ["rule:override"] }, rule: { ...rule, requiresSecondApproval: rule.severity === "Critical" && override.authorizedException }, reason: override.reason, evidence, secondApproval: override.secondApproval ? { approvedBy: "sample-qc-manager" } : null });
    if (!validation.valid) return;
    updateActive((review) => {
      review.rules = review.rules.map((item) => item.id === rule.id ? override.authorizedException ? {
        ...item,
        originalStatus: item.originalStatus || item.status,
        overridden: true,
        overrideReason: override.reason,
        overrideNote: override.note,
        authorizedException: { approvedBy: "QC Manager", reason: override.reason },
      } : {
        ...item,
        originalStatus: item.originalStatus || item.status,
        status: "Pass",
        overridden: true,
        overrideReason: override.reason,
        overrideNote: override.note,
      } : item);
      review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Sample Analyst", action: override.authorizedException ? "Authorized exception recorded" : "Finding resolved by analyst", detail: `${rule.id} · ${override.reason} · evidence ${evidence.sourceDocument} p.${evidence.page}${override.note ? ` · ${override.note}` : ""}` });
      return review;
    });
    setModal(null);
    setOverride({ reason: "", note: "", authorizedException: false, secondApproval: false });
  };

  const recordDisposition = () => {
    const rec = computeRecommendation(active.rules);
    if (rec !== RECOMMENDATION.READY || !canRecordReadyDisposition(active.rules).allowed || active.workflow === "Awaiting Correction") return;
    updateActive((review) => { review.workflow = "Completed"; review.disposition = "Ready for Funding"; review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Sample Analyst", action: "Final disposition recorded", detail: "Ready for Funding · system recommendation confirmed by a human" }); return review; });
  };

  const returnForCorrection = () => {
    const findings = active.rules.filter((rule) => (rule.status === "Fail" || rule.status === "Needs Review") && !rule.authorizedException);
    updateActive((review) => { review.workflow = "Awaiting Correction"; review.disposition = null; review.correctionRequest = { status: "Open", ruleIds: findings.map((rule) => rule.id), requestedAt: new Date().toISOString() }; review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Sample Analyst", action: "Package returned for correction", detail: `Correction requested for ${findings.map((rule) => rule.id).join(", ")} · awaiting resubmission` }); return review; });
  };

  return <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...display }}>
    <AppHeader screen={screen} setScreen={setScreen} />
    {screen === "dashboard" && <Dashboard reviews={reviews} openReview={openReview} />}
    {screen === "review" && <ReviewScreen active={active} filter={filter} setFilter={setFilter} onBack={() => setScreen("dashboard")} onOpenFinding={openFinding} onReady={recordDisposition} onReturn={returnForCorrection} />}
    {screen === "profiles" && <ProfilesScreen />}
    {screen === "governance" && <GovernanceScreen reviews={reviews} />}
    <OverrideModal modal={modal} override={override} setOverride={setOverride} onApply={applyOverride} onClose={() => setModal(null)} />
    <footer style={{ ...mono, textAlign: "center", color: C.sub, fontSize: 10, padding: 24 }}>Assay · sample-data portfolio prototype · not legal or compliance advice</footer>
  </div>;
}

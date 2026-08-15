import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  RECOMMENDATION,
  ROUTING_THRESHOLDS,
  canRecordReadyDisposition,
  computeRecommendation,
  validateOverride,
} from "./domain/mortgageQc.js";
import { applyEvidenceCorrection } from "./domain/humanCorrection.js";
import { DEMO_REVIEWS, PROFILE_REGISTRY } from "./data/mortgageDemo.js";
import { CORRECTABLE_QC_REVIEW } from "./data/humanReviewQcDemo.js";
import { loadLiveCaseSession, loadLivePdfSession, saveLiveCaseSession } from "./sessionLiveCase.js";
import FindingCard from "./FindingCard.jsx";

const PdfEvidenceViewer = lazy(() => import("./PdfEvidenceViewer.jsx"));

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
  const t = tone || { color: C.sub, bg: C.bg };
  return <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 750, color: t.color, background: t.bg, padding: "4px 8px", borderRadius: 6 }}>{children}</span>;
}

function Button({ children, onClick, disabled, variant = "primary" }) {
  const variants = {
    primary: { background: C.teal, color: "white", border: "1px solid transparent" },
    secondary: { background: C.panel, color: C.ink, border: `1px solid ${C.line}` },
    review: { background: C.reviewSoft, color: C.review, border: `1px solid ${C.review}44` },
    correction: { background: C.failSoft, color: C.fail, border: `1px solid ${C.fail}44` },
  };
  const style = disabled ? { background: "#e9edeb", color: "#8a9691", border: "1px solid transparent" } : variants[variant];
  return <button type="button" disabled={disabled} onClick={onClick} style={{ ...display, ...style, borderRadius: 8, padding: "9px 13px", fontSize: 11.5, fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

function ExperienceMode({ active = "demo" }) {
  return <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>EXPERIENCE MODE</div>
    <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, padding: 3, background: C.bg }}>
      <a href="/" style={{ ...mono, textDecoration: "none", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, color: active === "demo" ? C.teal : C.sub, background: active === "demo" ? C.tealSoft : "transparent" }}>Demo Workspace</a>
      <a href="/live" style={{ ...mono, textDecoration: "none", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, color: active === "live" ? C.teal : C.sub, background: active === "live" ? C.tealSoft : "transparent" }}>Live Analysis</a>
    </div>
    <div style={{ color: C.sub, fontSize: 10 }}>Sample data + session live cases · portfolio prototype</div>
  </div>;
}

function AppHeader({ screen, setScreen }) {
  return <header style={{ background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
    <div onClick={() => setScreen("dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: C.teal, color: "white", fontWeight: 800 }}>AY</div>
      <div><div style={{ fontWeight: 800 }}>Assay</div><div style={{ ...mono, color: C.sub, fontSize: 10 }}>post-execution mortgage QC</div></div>
    </div>
    <nav style={{ display: "flex", gap: 6 }}>
      {[["dashboard", "QC Dashboard"], ["profiles", "Rule Profiles"], ["governance", "AI Governance"]].map(([id, label]) => <button key={id} type="button" onClick={() => setScreen(id)} style={{ ...mono, border: `1px solid ${screen === id ? C.teal : C.line}`, color: screen === id ? C.teal : C.sub, background: screen === id ? C.tealSoft : C.panel, borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: 11 }}>{label}</button>)}
    </nav>
    <ExperienceMode />
  </header>;
}

function packageLifecycle(review) {
  if (review.workflow === "Completed" && review.disposition) return { label: review.disposition, helper: "Review completed", tone: statusStyle(review.disposition), open: false };
  if (review.workflow === "Awaiting Correction") return { label: "Awaiting Correction", helper: "Waiting for resubmission", tone: statusStyle("Awaiting Correction"), open: true };
  const recommendation = computeRecommendation(review.rules);
  return {
    label: recommendation,
    helper: recommendation === RECOMMENDATION.READY ? "Verify and confirm" : recommendation === RECOMMENDATION.REVIEW ? "Human judgment required" : "Corrective action required",
    tone: statusStyle(recommendation), open: true,
  };
}

function PackageRow({ review, openReview, compact = false }) {
  const lifecycle = packageLifecycle(review);
  const pages = review.documents.reduce((sum, doc) => sum + doc.pages, 0);
  const pass = review.rules.filter((r) => r.status === "Pass").length;
  const fail = review.rules.filter((r) => r.status === "Fail" && !r.authorizedException).length;
  const needs = review.rules.filter((r) => r.status === "Needs Review" && !r.authorizedException).length;
  const hasCorrectable = review.rules.some((rule) => Boolean(rule.correctableField && rule.correctionContext?.referenceValue && rule.status !== "Pass"));
  return <div onClick={() => openReview(review.id)} style={{ display: "grid", gridTemplateColumns: compact ? "100px minmax(220px,1.7fr) 160px 160px" : "100px minmax(220px,1.5fr) 105px 120px 185px 155px", gap: 10, alignItems: "center", padding: "13px 15px", borderBottom: `1px solid ${C.line}`, cursor: "pointer", fontSize: 12 }}>
    <span style={mono}>{review.id}</span>
    <span><b>{review.borrower}</b>{review.source === "live" && <> <Pill tone={{ color: C.blue, bg: C.blueSoft }}>LIVE</Pill></>}{hasCorrectable && <> <Pill tone={{ color: C.blue, bg: C.blueSoft }}>CORRECTABLE</Pill></>}<br /><span style={{ color: C.sub }}>{review.loanId} · {pages} pages · {review.documents.length} docs</span></span>
    {!compact && <span>{channelLabel[review.channel] || review.channel}</span>}
    {!compact && <span style={mono}>{review.jurisdiction} v{review.profile.version}</span>}
    <span><Pill tone={lifecycle.tone}>{lifecycle.tone.icon} {lifecycle.label}</Pill><br /><span style={{ color: C.sub, fontSize: 10 }}>{lifecycle.helper}</span></span>
    <span style={{ color: C.sub, fontSize: 10 }}>{pass} Pass · {fail} Fail · {needs} Review<br />{review.workflow}</span>
  </div>;
}

function HowAssayWorks() {
  const steps = [
    ["1", "Intake", "Receive an executed package through RON, Mobile Notary, QC Only, or upload."],
    ["2", "Understand", "OCR and AI classify documents, extract fields, and preserve source evidence."],
    ["3", "Apply Rules", "Assay selects the applicable rule profile and evaluates QC controls."],
    ["4", "Review", "Analysts inspect exceptions or uncertain evidence directly against the source."],
    ["5", "Dispose", "Correct evidence, override when authorized, return the package, or confirm disposition."],
  ];
  return <section style={{ marginTop: 22, background: C.muted, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
    <div style={{ marginBottom: 10 }}><div style={{ ...mono, color: C.sub, fontSize: 9 }}>QUICK ORIENTATION</div><h2 style={{ margin: "3px 0 0", fontSize: 15 }}>How Assay works</h2><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>A lightweight overview for first-time users.</div></div>
    <div style={{ display: "flex", alignItems: "stretch", gap: 6, overflowX: "auto" }}>{steps.map(([n, title, body], index) => <React.Fragment key={n}><div style={{ minWidth: 155, flex: 1, background: "#ffffffaa", border: `1px solid ${C.line}`, borderRadius: 9, padding: 11 }}><Pill tone={{ color: C.teal, bg: C.tealSoft }}>{n}</Pill><div style={{ fontWeight: 800, marginTop: 7, fontSize: 11.5 }}>{title}</div><div style={{ color: C.sub, fontSize: 10, lineHeight: 1.45, marginTop: 4 }}>{body}</div></div>{index < steps.length - 1 && <div aria-hidden="true" style={{ alignSelf: "center", color: "#9aa7a1", fontSize: 18 }}>→</div>}</React.Fragment>)}</div>
  </section>;
}

function Dashboard({ reviews, openReview }) {
  const openReviews = reviews.filter((review) => packageLifecycle(review).open);
  const completedReviews = reviews.filter((review) => !packageLifecycle(review).open);
  const recommendations = openReviews.map((review) => computeRecommendation(review.rules));
  const kpis = [
    ["Open Reviews", openReviews.length],
    ["Ready for Review", recommendations.filter((x) => x === RECOMMENDATION.READY).length],
    ["Needs Review", recommendations.filter((x) => x === RECOMMENDATION.REVIEW).length],
    ["Exceptions", recommendations.filter((x) => x === RECOMMENDATION.EXCEPTION).length],
    ["Completed", completedReviews.length],
  ];
  return <main style={{ padding: 24, maxWidth: 1220, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }}><div><h1 style={{ margin: 0, fontSize: 25 }}>QC Dashboard</h1><p style={{ color: C.sub, margin: "6px 0 0", fontSize: 13 }}>One review queue for sample packages and live-analyzed cases.</p></div><a href="/live" style={{ textDecoration: "none" }}><Button>+ New Live Case</Button></a></div>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, margin: "20px 0" }}>{kpis.map(([label, value]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 10 }}>{label.toUpperCase()}</div><div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>{value}</div></div>)}</section>
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}><div style={{ padding: "13px 15px", borderBottom: `1px solid ${C.line}` }}><b>Package Review Queue</b><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>Open packages are prioritized by what the analyst needs to do next.</div></div>{openReviews.map((review) => <PackageRow key={review.id} review={review} openReview={openReview} />)}</section>
    {completedReviews.length > 0 && <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden", marginTop: 14 }}><div style={{ padding: "12px 15px", borderBottom: `1px solid ${C.line}` }}><b>Recently Completed</b><div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>Final human dispositions; no further analyst action is required.</div></div>{completedReviews.map((review) => <PackageRow key={review.id} review={review} openReview={openReview} compact />)}</section>}
    <HowAssayWorks />
  </main>;
}

function TechnicalDetails({ active }) {
  return <details style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}><summary style={{ cursor: "pointer", fontWeight: 750, fontSize: 11.5 }}>Technical details</summary><div style={{ marginTop: 8 }}>{[["Profile", `${active.profile.id} v${active.profile.version}`], ["Profile effective", active.profile.effectiveAt], ["Document hash", active.evaluationContext.documentHash], ["Extractor", `${active.evaluationContext.extractorProvider} ${active.evaluationContext.extractorVersion}`], ["Processing mode", active.processing.mode]].map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 10.5 }}><span style={{ color: C.sub }}>{k}</span><span style={{ ...mono, textAlign: "right" }}>{v}</span></div>)}</div></details>;
}

function documentFindingState(active, docName) {
  const rules = active.rules.filter((rule) => rule.evidence?.sourceDocument === docName);
  const unresolvedFail = rules.filter((rule) => rule.status === "Fail" && !rule.authorizedException).length;
  const unresolvedReview = rules.filter((rule) => rule.status === "Needs Review" && !rule.authorizedException).length;
  const resolved = rules.filter((rule) => rule.overridden || rule.authorizedException || rule.correctedByHuman).length;
  if (unresolvedFail) return { label: `${unresolvedFail} issue${unresolvedFail > 1 ? "s" : ""}`, tone: { color: C.fail, bg: C.failSoft } };
  if (unresolvedReview) return { label: `${unresolvedReview} needs review`, tone: { color: C.review, bg: C.reviewSoft } };
  if (resolved) return { label: "Resolved", tone: { color: C.purple, bg: C.purpleSoft } };
  return null;
}

function ReviewActions({ active, recommendation, readyCheck, onReady, onReturn, onOpenFinding, compact = false }) {
  if (active.workflow === "Completed" || active.workflow === "Awaiting Correction") return null;
  const firstBlocker = active.rules.find((r) => (r.status === "Fail" || r.status === "Needs Review") && !r.authorizedException);
  return <div style={{ display: "flex", justifyContent: compact ? "flex-start" : "flex-end", gap: 8, flexWrap: "wrap" }}>
    {firstBlocker && !firstBlocker.correctableField && <Button variant="review" onClick={() => onOpenFinding(firstBlocker)}>Review finding</Button>}
    {firstBlocker && <Button variant="correction" onClick={onReturn}>Return for correction</Button>}
    <Button disabled={recommendation !== RECOMMENDATION.READY || !readyCheck.allowed} onClick={onReady}>Confirm Ready for Funding</Button>
  </div>;
}

function LiveSourcePanel({ active, selectedRule }) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    const stored = loadLivePdfSession();
    if (!stored?.pdfBase64) return;
    const binary = atob(stored.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    setFile(new File([bytes], stored.fileName || "live-source.pdf", { type: "application/pdf" }));
  }, [active.id]);
  if (!file) return <div style={{ background: C.reviewSoft, color: C.review, borderRadius: 9, padding: 11, fontSize: 11 }}>Source PDF is not available in this browser session. The extracted evidence remains available in the finding cards.</div>;
  return <Suspense fallback={<div style={{ padding: 14, color: C.sub, fontSize: 11 }}>Loading source PDF…</div>}><PdfEvidenceViewer file={file} evidence={selectedRule?.evidence} /></Suspense>;
}

function ReviewScreen({ active, filter, setFilter, onBack, onOpenFinding, onApplyCorrection, onReady, onReturn }) {
  const recommendation = computeRecommendation(active.rules);
  const readyCheck = canRecordReadyDisposition(active.rules);
  const tone = statusStyle(recommendation);
  const shown = active.rules.filter((rule) => filter === "All" || rule.status === filter);
  const isAwaitingCorrection = active.workflow === "Awaiting Correction";
  const isCompleted = active.workflow === "Completed" && Boolean(active.disposition);
  const totalPages = active.documents.reduce((sum, doc) => sum + doc.pages, 0);
  const [selectedRuleId, setSelectedRuleId] = useState(active.rules.find((r) => r.status !== "Pass")?.id || active.rules[0]?.id || null);
  const selectedRule = active.rules.find((r) => r.id === selectedRuleId) || active.rules[0];
  const blockers = readyCheck.blockers;
  const unresolvedFails = active.rules.filter((r) => r.status === "Fail" && !r.authorizedException).length;
  const unresolvedReview = active.rules.filter((r) => r.status === "Needs Review" && !r.authorizedException).length;
  let banner = recommendation === RECOMMENDATION.READY ? "No blockers found · review evidence and confirm the package." : recommendation === RECOMMENDATION.REVIEW ? `${unresolvedReview} finding requires human review.` : `${unresolvedFails} finding requires corrective action.`;
  if (isCompleted) banner = `Review completed · ${active.disposition}. No further action is required.`;
  if (isAwaitingCorrection) banner = "Package returned · awaiting corrected documents.";

  return <main style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
    <button type="button" onClick={onBack} style={{ ...mono, background: "none", border: 0, color: C.sub, cursor: "pointer" }}>← QC Dashboard</button>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap", margin: "12px 0" }}>
      <div><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h1 style={{ margin: 0, fontSize: 22 }}>{active.borrower}</h1>{active.source === "live" && <Pill tone={{ color: C.blue, bg: C.blueSoft }}>LIVE CASE</Pill>}{active.scenario === "Borrower extraction correction" && <Pill tone={{ color: C.blue, bg: C.blueSoft }}>HITL SAMPLE</Pill>}</div><div style={{ color: C.sub, fontSize: 12, marginTop: 5 }}>{active.loanId} · {channelLabel[active.channel] || active.channel} · {active.jurisdiction} · {active.documents.length} documents · {totalPages} pages · {active.profile.id} v{active.profile.version}</div></div>
      <div style={{ display: "grid", gap: 9, justifyItems: "end" }}><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>SYSTEM RECOMMENDATION</div><Pill tone={tone}>{tone.icon} {recommendation}</Pill></div><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>WORKFLOW</div><Pill tone={statusStyle(active.workflow)}>{active.workflow}</Pill></div><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>FINAL DISPOSITION</div><Pill tone={active.disposition ? statusStyle(active.disposition) : undefined}>{active.disposition || "Not recorded"}</Pill></div></div><ReviewActions active={active} recommendation={recommendation} readyCheck={readyCheck} onReady={onReady} onReturn={onReturn} onOpenFinding={onOpenFinding} /></div>
    </div>
    <div style={{ background: isCompleted ? C.passSoft : isAwaitingCorrection ? C.reviewSoft : tone.bg, color: isCompleted ? C.pass : isAwaitingCorrection ? C.review : tone.color, borderRadius: 9, padding: 11, fontSize: 12, marginBottom: 14 }}><b>{banner}</b>{blockers.length > 0 && !isCompleted && !isAwaitingCorrection && <div style={{ marginTop: 4 }}>Funding confirmation is blocked by {blockers.map((item) => item.id).join(", ")}. Correct an eligible extraction directly in its finding, use <b>Override / exception</b> only when the evidence is accepted despite the system result, or return the source package when it must be fixed.</div>}{active.source === "live" && <div style={{ marginTop: 4 }}>This live case uses the Live Note Baseline profile. Jurisdiction-specific mortgage rule resolution is not yet connected in the live pipeline.</div>}</div>

    <section style={{ display: "grid", gridTemplateColumns: active.source === "live" ? "minmax(390px,1.05fr) minmax(520px,1.35fr)" : "minmax(260px,.8fr) minmax(500px,1.7fr)", gap: 14, alignItems: "start" }}>
      <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
        {active.source === "live" && <div style={{ position: "sticky", top: 12 }}><LiveSourcePanel active={active} selectedRule={selectedRule} /></div>}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ fontWeight: 750 }}>Package documents</div><div style={{ color: C.sub, fontSize: 10.5, margin: "3px 0 8px" }}>{active.documents.length} documents · {totalPages} total pages</div>{active.documents.map((doc) => { const state = documentFindingState(active, doc.name); return <div key={doc.name} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><b>{doc.name}</b><br /><span style={{ color: C.sub }}>{doc.pages} pages · {doc.status}</span></div>{state && <Pill tone={state.tone}>{state.label}</Pill>}</div>; })}</div>
        <TechnicalDetails active={active} />
      </aside>
      <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>{["All", "Fail", "Needs Review", "Pass"].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} style={{ ...mono, border: `1px solid ${filter === item ? C.teal : C.line}`, background: filter === item ? C.tealSoft : C.panel, color: filter === item ? C.teal : C.sub, borderRadius: 6, padding: "6px 9px", cursor: "pointer", fontSize: 10 }}>{item}</button>)}</div>
        <div style={{ display: "grid", gap: 9 }}>{shown.map((rule) => <FindingCard key={rule.id} rule={rule} selected={rule.id === selectedRuleId} isLive={active.source === "live"} disabled={Boolean(active.disposition) || isAwaitingCorrection} onSelectEvidence={() => setSelectedRuleId(rule.id)} onOpenFinding={onOpenFinding} onApplyCorrection={onApplyCorrection} />)}</div>
        <div style={{ marginTop: 14 }}><ReviewActions compact active={active} recommendation={recommendation} readyCheck={readyCheck} onReady={onReady} onReturn={onReturn} onOpenFinding={onOpenFinding} /></div>
        <div style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><b>Audit history</b>{active.audit.map((event, index) => <div key={`${event.at}-${index}`} style={{ display: "grid", gridTemplateColumns: "60px 105px 1fr", gap: 9, padding: "9px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><span style={mono}>{event.at}</span><b>{event.actor}</b><span>{event.action} · <span style={{ color: C.sub }}>{event.detail}</span></span></div>)}</div>
      </div>
    </section>
  </main>;
}

function ProfilesScreen() {
  return <main style={{ padding: 24, maxWidth: 950, margin: "0 auto" }}><h1>Published Rule Profiles</h1><p style={{ color: C.sub, fontSize: 13 }}>Assay resolves the applicable rule profile from jurisdiction and future loan, investor, client, and execution-channel overlays.</p><div style={{ display: "grid", gap: 12 }}>{Object.values(PROFILE_REGISTRY).map((profile) => <div key={profile.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr repeat(4,120px)", gap: 10, alignItems: "center", fontSize: 12 }}><b>{profile.jurisdiction}</b><span style={mono}>{profile.id}</span><span>v{profile.version}</span><span>{profile.effectiveAt}</span><Pill tone={{ color: C.pass, bg: C.passSoft }}>{profile.status}</Pill></div>)}</div><div style={{ marginTop: 14, background: C.reviewSoft, color: C.review, borderRadius: 9, padding: 12, fontSize: 11 }}>Sample profiles are fictional and are not legal, compliance, investor, or underwriting guidance. Live cases currently use a separate baseline profile until policy resolution is connected.</div></main>;
}

function GovernanceScreen({ reviews }) {
  const allRules = reviews.flatMap((review) => review.rules);
  const overrides = allRules.filter((rule) => rule.overridden).length;
  const corrections = allRules.filter((rule) => rule.correctedByHuman).length;
  const lowConfidence = allRules.filter((rule) => rule.confidence?.reviewTrigger).length;
  return <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}><h1>AI Governance</h1><p style={{ color: C.sub, maxWidth: 780, fontSize: 13 }}>Confidence routes work; it does not determine the final business disposition. Human corrections change evidence and rerun controls; overrides remain a separate accountable action.</p><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, margin: "18px 0" }}>{[["Rule evaluations", allRules.length], ["Human corrections", corrections], ["Human overrides", overrides], ["Confidence routes", lowConfidence], ["False-ready release gate", "0"], ["Class threshold", ROUTING_THRESHOLDS.classification.toFixed(2)], ["Extract threshold", ROUTING_THRESHOLDS.extraction.toFixed(2)]].map(([k,v]) => <div key={k} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 10 }}>{k.toUpperCase()}</div><div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>{v}</div></div>)}</section></main>;
}

function OverrideModal({ modal, override, setOverride, onApply, onClose }) {
  if (modal?.type !== "override") return null;
  const rule = modal.rule;
  const requiresApproval = rule.severity === "Critical" && override.authorizedException;
  const valid = Boolean(override.reason) && (!requiresApproval || override.secondApproval);
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#12211d88", display: "grid", placeItems: "center", zIndex: 20 }}><div onClick={(event) => event.stopPropagation()} style={{ width: "min(520px,92vw)", background: C.panel, borderRadius: 12, padding: 20 }}><h2 style={{ marginTop: 0 }}>{rule.correctableField ? "Override / exception" : "Review"} {rule.id}</h2><p style={{ color: C.sub, fontSize: 12 }}>System result: <b>{rule.status}</b>. Source evidence is pinned to {rule.evidence.sourceDocument}, page {rule.evidence.page}.{rule.correctableField ? " If the AI extraction itself is wrong, use Correct extracted value in the finding card instead." : ""}</p><label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Reason<select value={override.reason} onChange={(event) => setOverride((current) => ({ ...current, reason: event.target.value }))} style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7 }}><option value="">Select…</option><option>Evidence found elsewhere</option><option>Acceptable variation</option><option>Policy exception</option><option>Other evidence-backed resolution</option></select></label><label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Analyst note<textarea rows={4} value={override.note} onChange={(event) => setOverride((current) => ({ ...current, note: event.target.value }))} placeholder="Describe what you verified in the source document…" style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7, resize: "vertical" }} /></label><label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, marginBottom: 10 }}><input type="checkbox" checked={override.authorizedException} onChange={(event) => setOverride((current) => ({ ...current, authorizedException: event.target.checked }))} />Record as formally authorized policy exception</label>{requiresApproval && <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.fail, marginBottom: 12 }}><input type="checkbox" checked={override.secondApproval} onChange={(event) => setOverride((current) => ({ ...current, secondApproval: event.target.checked }))} />QC manager second approval</label>}<div style={{ display: "flex", gap: 8 }}><Button disabled={!valid} onClick={onApply}>Record evidence-backed action</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div></div></div>;
}

function initialReviews() {
  const samples = [CORRECTABLE_QC_REVIEW, ...DEMO_REVIEWS.filter((review) => review.id !== CORRECTABLE_QC_REVIEW.id)];
  const live = loadLiveCaseSession();
  return live ? [live, ...samples.filter((review) => review.id !== live.id)] : samples;
}

export default function UnifiedApp() {
  const [reviews, setReviews] = useState(initialReviews);
  const requestedCase = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("case") : null;
  const initialCase = reviews.find((review) => review.id === requestedCase);
  const [screen, setScreen] = useState(initialCase ? "review" : "dashboard");
  const [activeId, setActiveId] = useState(initialCase?.id || reviews[0].id);
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [override, setOverride] = useState({ reason: "", note: "", authorizedException: false, secondApproval: false });
  const active = useMemo(() => reviews.find((review) => review.id === activeId) || reviews[0], [reviews, activeId]);

  const persistIfLive = (review) => {
    if (review.source !== "live") return;
    const pdf = loadLivePdfSession();
    saveLiveCaseSession({ review, pdfBase64: pdf?.pdfBase64, fileName: pdf?.fileName });
  };
  const openReview = (id) => { setActiveId(id); setFilter("All"); setScreen("review"); window.history.replaceState({}, "", `/?case=${encodeURIComponent(id)}`); };
  const backToDashboard = () => { setScreen("dashboard"); window.history.replaceState({}, "", "/"); };
  const updateActive = (fn) => setReviews((items) => items.map((review) => {
    if (review.id !== active.id) return review;
    const next = fn(structuredClone(review));
    persistIfLive(next);
    return next;
  }));
  const openFinding = (rule) => { setModal({ type: "override", rule }); setOverride({ reason: "", note: "", authorizedException: false, secondApproval: false }); };

  const applyCorrection = (ruleId, correctedValue, note) => {
    const { review: next, result } = applyEvidenceCorrection(active, {
      ruleId,
      correctedValue,
      actor: "Analyst",
      note,
      at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    setReviews((items) => items.map((review) => review.id === active.id ? next : review));
    persistIfLive(next);
    return result;
  };

  const applyOverride = () => {
    const rule = modal.rule;
    const validation = validateOverride({ actor: { id: "analyst", permissions: ["rule:override"] }, rule: { ...rule, requiresSecondApproval: rule.severity === "Critical" && override.authorizedException }, reason: override.reason, evidence: rule.evidence, secondApproval: override.secondApproval ? { approvedBy: "qc-manager" } : null });
    if (!validation.valid) return;
    updateActive((review) => {
      review.rules = review.rules.map((item) => item.id !== rule.id ? item : override.authorizedException ? { ...item, originalStatus: item.originalStatus || item.status, overridden: true, overrideReason: override.reason, overrideNote: override.note, authorizedException: { approvedBy: "QC Manager", reason: override.reason } } : { ...item, originalStatus: item.originalStatus || item.status, status: "Pass", overridden: true, overrideReason: override.reason, overrideNote: override.note });
      review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Analyst", action: override.authorizedException ? "Authorized exception recorded" : "Finding resolved by analyst", detail: `${rule.id} · ${override.reason} · evidence ${rule.evidence.sourceDocument} p.${rule.evidence.page}${override.note ? ` · ${override.note}` : ""}` });
      return review;
    });
    setModal(null); setOverride({ reason: "", note: "", authorizedException: false, secondApproval: false });
  };

  const recordDisposition = () => {
    if (computeRecommendation(active.rules) !== RECOMMENDATION.READY || !canRecordReadyDisposition(active.rules).allowed || active.workflow === "Awaiting Correction") return;
    updateActive((review) => { review.workflow = "Completed"; review.disposition = "Ready for Funding"; review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Analyst", action: "Final disposition recorded", detail: "Ready for Funding · system recommendation confirmed by a human" }); return review; });
  };
  const returnForCorrection = () => {
    const findings = active.rules.filter((rule) => (rule.status === "Fail" || rule.status === "Needs Review") && !rule.authorizedException);
    updateActive((review) => { review.workflow = "Awaiting Correction"; review.disposition = null; review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Analyst", action: "Package returned for correction", detail: `Correction requested for ${findings.map((rule) => rule.id).join(", ")} · awaiting resubmission` }); return review; });
  };

  return <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...display }}><AppHeader screen={screen} setScreen={(next) => { setScreen(next); if (next !== "review") window.history.replaceState({}, "", "/"); }} />{screen === "dashboard" && <Dashboard reviews={reviews} openReview={openReview} />}{screen === "review" && <ReviewScreen key={active.id} active={active} filter={filter} setFilter={setFilter} onBack={backToDashboard} onOpenFinding={openFinding} onApplyCorrection={applyCorrection} onReady={recordDisposition} onReturn={returnForCorrection} />}{screen === "profiles" && <ProfilesScreen />}{screen === "governance" && <GovernanceScreen reviews={reviews} />}<OverrideModal modal={modal} override={override} setOverride={setOverride} onApply={applyOverride} onClose={() => setModal(null)} /><footer style={{ ...mono, textAlign: "center", color: C.sub, fontSize: 10, padding: 24 }}>Assay · sample-data portfolio prototype · not legal or compliance advice</footer></div>;
}

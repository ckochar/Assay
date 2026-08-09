import React, { useMemo, useState } from "react";
import {
  RECOMMENDATION,
  canRecordReadyDisposition,
  computeRecommendation,
  validateOverride,
} from "./domain/mortgageQc.js";
import { DEMO_REVIEWS, PROFILE_REGISTRY, SAMPLE_OPTIONS } from "./data/mortgageDemo.js";

const C = {
  bg: "#f5f7f6",
  panel: "#ffffff",
  ink: "#14211d",
  sub: "#60706a",
  line: "#dfe6e2",
  teal: "#0d6259",
  tealSoft: "#e4f0ee",
  pass: "#177245",
  passSoft: "#e8f4ed",
  fail: "#ad312b",
  failSoft: "#fae9e7",
  review: "#93620a",
  reviewSoft: "#f8efd9",
  blue: "#215f87",
  blueSoft: "#e8f1f7",
  purple: "#534aa2",
  purpleSoft: "#eeecf8",
};

const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

const channelLabel = {
  RON: "RON",
  MOBILE_NOTARY: "Mobile notary",
  QC_ONLY: "QC only",
};

function statusStyle(status) {
  if (status === "Pass" || status === RECOMMENDATION.READY) return { color: C.pass, bg: C.passSoft, icon: "✓" };
  if (status === "Fail" || status === RECOMMENDATION.EXCEPTION) return { color: C.fail, bg: C.failSoft, icon: "×" };
  if (status === "Needs Review" || status === RECOMMENDATION.REVIEW) return { color: C.review, bg: C.reviewSoft, icon: "!" };
  return { color: C.sub, bg: C.bg, icon: "•" };
}

function Pill({ children, tone }) {
  const style = tone || { color: C.sub, bg: C.bg };
  return <span style={{ ...mono, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: style.color, background: style.bg, padding: "4px 8px", borderRadius: 6 }}>{children}</span>;
}

function Button({ children, onClick, disabled, secondary = false, danger = false }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{ ...display, border: secondary ? `1px solid ${C.line}` : "none", background: disabled ? "#e9edeb" : danger ? C.failSoft : secondary ? C.panel : C.teal, color: disabled ? "#8a9691" : danger ? C.fail : secondary ? C.ink : "white", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

function Confidence({ confidence }) {
  const values = [
    ["Class", confidence.classification],
    ["Extract", confidence.extraction],
    ["OCR", confidence.ocrQuality],
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {values.map(([label, value]) => value != null && <Pill key={label}>{label} {typeof value === "number" ? value.toFixed(2) : value}</Pill>)}
      <Pill tone={confidence.evidenceComplete ? { color: C.pass, bg: C.passSoft } : { color: C.review, bg: C.reviewSoft }}>
        Evidence {confidence.evidenceComplete ? "complete" : "incomplete"}
      </Pill>
    </div>
  );
}

export default function App() {
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [screen, setScreen] = useState("dashboard");
  const [activeId, setActiveId] = useState(DEMO_REVIEWS[0].id);
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [override, setOverride] = useState({ reason: "", note: "", authorizedException: false, secondApproval: false });

  const active = reviews.find((review) => review.id === activeId) || reviews[0];
  const recommendation = computeRecommendation(active.rules);
  const readyCheck = canRecordReadyDisposition(active.rules);

  const recommendationFor = (review) => computeRecommendation(review.rules);
  const openReview = (id) => { setActiveId(id); setFilter("All"); setScreen("review"); };

  const updateActive = (fn) => setReviews((items) => items.map((review) => review.id === active.id ? fn(structuredClone(review)) : review));

  const applyOverride = () => {
    const rule = modal.rule;
    const evidence = rule.evidence;
    const validation = validateOverride({
      actor: { id: "demo-analyst", permissions: ["rule:override"] },
      rule: { ...rule, requiresSecondApproval: rule.severity === "Critical" && override.authorizedException },
      reason: override.reason,
      evidence,
      secondApproval: override.secondApproval ? { approvedBy: "demo-qc-manager" } : null,
    });
    if (!validation.valid) return;

    updateActive((review) => {
      review.rules = review.rules.map((item) => item.id === rule.id ? {
        ...item,
        originalStatus: item.status,
        status: "Pass",
        overridden: true,
        overrideReason: override.reason,
        overrideNote: override.note,
        authorizedException: override.authorizedException,
      } : item);
      review.audit.push({
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: "Demo Analyst",
        action: override.authorizedException ? "Authorized exception recorded" : "Extraction/rule override recorded",
        detail: `${rule.id} · ${override.reason} · evidence ${evidence.sourceDocument} p.${evidence.page}${override.secondApproval ? " · second approval Demo QC Manager" : ""}`,
      });
      return review;
    });
    setModal(null);
    setOverride({ reason: "", note: "", authorizedException: false, secondApproval: false });
  };

  const recordDisposition = () => {
    const currentRecommendation = computeRecommendation(active.rules);
    if (currentRecommendation !== RECOMMENDATION.READY || !canRecordReadyDisposition(active.rules).allowed) return;
    updateActive((review) => {
      review.workflow = "Completed";
      review.disposition = "Ready for Funding";
      review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Demo Analyst", action: "Final disposition recorded", detail: "Ready for Funding · system recommendation confirmed by a human" });
      return review;
    });
  };

  const returnForCorrection = () => {
    const findings = active.rules.filter((rule) => rule.status === "Fail" || rule.status === "Needs Review");
    updateActive((review) => {
      review.workflow = "Returned";
      review.disposition = "Correction Required";
      review.audit.push({ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "Demo Analyst", action: "Package returned", detail: `Correction request generated for ${findings.map((rule) => rule.id).join(", ")}` });
      return review;
    });
  };

  const kpis = useMemo(() => {
    const recommendations = reviews.map(recommendationFor);
    return [
      ["Packages", reviews.length],
      ["Ready", recommendations.filter((item) => item === RECOMMENDATION.READY).length],
      ["Exceptions", recommendations.filter((item) => item === RECOMMENDATION.EXCEPTION).length],
      ["Human review", recommendations.filter((item) => item === RECOMMENDATION.REVIEW).length],
      ["False-ready gate", "0 allowed"],
      ["Median demo time", "13.1 sec"],
    ];
  }, [reviews]);

  const Nav = () => (
    <header style={{ background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div onClick={() => setScreen("dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ ...display, width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: C.teal, color: "white", fontWeight: 800 }}>AY</div>
        <div><div style={{ ...display, fontWeight: 800 }}>Assay</div><div style={{ ...mono, color: C.sub, fontSize: 10 }}>post-execution mortgage QC</div></div>
      </div>
      <nav style={{ display: "flex", gap: 6 }}>
        {[["dashboard", "Operations"], ["profiles", "Rule profiles"], ["governance", "AI governance"]].map(([id, label]) => (
          <button key={id} onClick={() => setScreen(id)} style={{ ...mono, border: `1px solid ${screen === id ? C.teal : C.line}`, color: screen === id ? C.teal : C.sub, background: screen === id ? C.tealSoft : C.panel, borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: 11 }}>{label}</button>
        ))}
      </nav>
      <div style={{ ...mono, color: C.sub, fontSize: 10, textAlign: "right" }}>PRELOADED SYNTHETIC SAMPLES<br />OCR + LLM NOT YET CONNECTED</div>
    </header>
  );

  const Dashboard = () => (
    <main style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><h1 style={{ ...display, margin: 0, fontSize: 25 }}>Post-execution QC operations</h1><p style={{ color: C.sub, margin: "6px 0 0", fontSize: 13 }}>Exception-focused review across RON, mobile-notary and QC-only intake.</p></div>
        <Button onClick={() => setScreen("samples")}>Run guided sample</Button>
      </div>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, margin: "20px 0" }}>
        {kpis.map(([label, value]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 10, textTransform: "uppercase" }}>{label}</div><div style={{ ...display, fontSize: 22, fontWeight: 800, marginTop: 5 }}>{value}</div></div>)}
      </section>
      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
        <div style={{ padding: "11px 15px", borderBottom: `1px solid ${C.line}`, fontWeight: 750 }}>Active review queue</div>
        {reviews.map((review) => {
          const rec = recommendationFor(review);
          const tone = statusStyle(rec);
          return <div key={review.id} onClick={() => openReview(review.id)} style={{ display: "grid", gridTemplateColumns: "90px 115px minmax(180px,1fr) 120px 110px 175px 125px", gap: 10, alignItems: "center", padding: "12px 15px", borderBottom: `1px solid ${C.line}`, cursor: "pointer", fontSize: 12 }}>
            <span style={mono}>{review.id}</span><span style={mono}>{review.loanId}</span><span><b>{review.borrower}</b><br /><span style={{ color: C.sub }}>{review.property}</span></span><span>{channelLabel[review.channel]}</span><span style={mono}>{review.profile.id.split("-").at(-1)} v{review.profile.version}</span><Pill tone={tone}>{tone.icon} {rec}</Pill><span style={{ color: review.disposition ? C.teal : C.sub }}>{review.disposition || review.workflow}</span>
          </div>;
        })}
      </section>
    </main>
  );

  const Review = () => {
    const shown = active.rules.filter((rule) => filter === "All" || rule.status === filter);
    const tone = statusStyle(recommendation);
    return (
      <main style={{ padding: 20, maxWidth: 1280, margin: "0 auto" }}>
        <button onClick={() => setScreen("dashboard")} style={{ ...mono, background: "none", border: 0, color: C.sub, cursor: "pointer" }}>← operations</button>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap", margin: "12px 0 16px" }}>
          <div><h1 style={{ ...display, margin: 0, fontSize: 22 }}>{active.borrower}</h1><div style={{ color: C.sub, fontSize: 12, marginTop: 5 }}>{active.loanId} · {active.property} · {channelLabel[active.channel]}</div></div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>SYSTEM RECOMMENDATION</div><Pill tone={tone}>{tone.icon} {recommendation}</Pill></div><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>WORKFLOW</div><Pill>{active.workflow}</Pill></div><div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>FINAL DISPOSITION</div><Pill>{active.disposition || "Not recorded"}</Pill></div></div>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(260px,0.8fr) minmax(500px,1.7fr)", gap: 14 }}>
          <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 750, marginBottom: 10 }}>Evaluation context</div>
              {[['Profile', `${active.profile.id} v${active.profile.version}`], ['Effective', active.profile.effectiveAt], ['Document hash', active.evaluationContext.documentHash], ['Extractor', `${active.evaluationContext.extractorProvider} ${active.evaluationContext.extractorVersion}`], ['Mode', active.processing.mode]].map(([k,v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><span style={{ color: C.sub }}>{k}</span><span style={{ ...mono, textAlign: "right" }}>{v}</span></div>)}
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 750, marginBottom: 8 }}>Package documents</div>
              {active.documents.map((doc) => <div key={doc.name} style={{ padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><b>{doc.name}</b><br /><span style={{ color: C.sub }}>{doc.pages} pages · {doc.status}</span></div>)}
            </div>
            <div style={{ background: C.blueSoft, border: `1px solid ${C.blue}33`, borderRadius: 10, padding: 14 }}><b style={{ color: C.blue }}>Current demo boundary</b><p style={{ fontSize: 11, lineHeight: 1.5, color: C.blue, marginBottom: 0 }}>The rule engine and review workflow are interactive. Package content and extraction outputs are synthetic fixtures. Live Azure Document Intelligence and LLM extraction are the next implementation phase.</p></div>
          </aside>

          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>{["All", "Fail", "Needs Review", "Pass"].map((item) => <button key={item} onClick={() => setFilter(item)} style={{ ...mono, border: `1px solid ${filter === item ? C.teal : C.line}`, background: filter === item ? C.tealSoft : C.panel, color: filter === item ? C.teal : C.sub, borderRadius: 6, padding: "6px 9px", cursor: "pointer", fontSize: 10 }}>{item}</button>)}</div>
            <div style={{ display: "grid", gap: 9 }}>
              {shown.map((rule) => {
                const ruleTone = statusStyle(rule.status);
                return <article key={rule.id} style={{ background: C.panel, border: `1px solid ${ruleTone.color}44`, borderLeft: `4px solid ${ruleTone.color}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><Pill>{rule.id}</Pill> <b style={{ fontSize: 13 }}>{rule.name}</b> <span style={{ ...mono, fontSize: 9, color: rule.fundingCritical ? C.fail : C.sub }}>{rule.fundingCritical ? "FUNDING CRITICAL" : rule.severity.toUpperCase()}</span></div><Pill tone={ruleTone}>{ruleTone.icon} {rule.status}</Pill></div>
                  <p style={{ color: C.sub, fontSize: 11.5, margin: "9px 0" }}>{rule.requirement}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 11 }}><span style={{ color: C.sub }}>Extracted result</span><br /><b>{rule.extractedValue}</b></div><div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 11 }}><span style={{ color: C.sub }}>Source evidence</span><br /><b>{rule.evidence.sourceDocument} · page {rule.evidence.page}</b><br /><span>{rule.evidence.excerpt}</span></div></div>
                  <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><Confidence confidence={rule.confidence} />{rule.status !== "Pass" && !active.disposition && <Button secondary onClick={() => { setModal({ type: "override", rule }); setOverride({ reason: "", note: "", authorizedException: false, secondApproval: false }); }}>Review finding</Button>}</div>
                  {rule.overridden && <div style={{ marginTop: 9, fontSize: 11, color: C.purple, background: C.purpleSoft, padding: 8, borderRadius: 7 }}>Original system result: {rule.originalStatus}. Human action: {rule.overrideReason}{rule.authorizedException ? " · authorized policy exception" : ""}.</div>}
                </article>;
              })}
            </div>
            {!active.disposition && <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}><Button disabled={recommendation !== RECOMMENDATION.READY || !readyCheck.allowed} onClick={recordDisposition}>Confirm Ready for Funding</Button><Button secondary onClick={returnForCorrection} disabled={recommendation === RECOMMENDATION.READY}>Return for correction</Button></div>}
            {!readyCheck.allowed && <div style={{ marginTop: 9, color: C.fail, fontSize: 11 }}>Funding confirmation blocked by {readyCheck.blockers.map((item) => item.id).join(", ")}. Resolve through evidence-backed override, an authorized exception, correction, or escalation.</div>}
            <div style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ fontWeight: 750 }}>Audit history</div>{active.audit.map((event, index) => <div key={`${event.at}-${index}`} style={{ display: "grid", gridTemplateColumns: "55px 105px 1fr", gap: 9, padding: "9px 0", borderBottom: `1px solid ${C.line}`, fontSize: 11 }}><span style={mono}>{event.at}</span><b>{event.actor}</b><span>{event.action} · <span style={{ color: C.sub }}>{event.detail}</span></span></div>)}</div>
          </div>
        </section>
      </main>
    );
  };

  const Samples = () => <main style={{ padding: 24, maxWidth: 850, margin: "0 auto" }}><h1 style={{ ...display }}>Guided recruiter demo</h1><p style={{ color: C.sub }}>Choose a scenario. Each one demonstrates a different product decision: straight-through readiness, deterministic exception handling, or uncertainty-based human routing.</p><div style={{ display: "grid", gap: 12 }}>{SAMPLE_OPTIONS.map((sample, index) => <div key={sample.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 16, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}><div><Pill>{index + 1}</Pill> <b>{sample.label}</b><p style={{ color: C.sub, fontSize: 12, marginBottom: 0 }}>{sample.description}</p></div><Button onClick={() => openReview(sample.id)}>Open sample</Button></div>)}</div></main>;

  const Profiles = () => <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}><h1 style={{ ...display }}>Published rule profiles</h1><p style={{ color: C.sub, fontSize: 13 }}>Policy parameters are data; reusable rule templates are deterministic code. Every evaluation pins the exact published version used.</p><div style={{ display: "grid", gap: 12 }}>{Object.values(PROFILE_REGISTRY).map((profile) => <div key={profile.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr repeat(4,120px)", gap: 10, alignItems: "center", fontSize: 12 }}><b>{profile.jurisdiction}</b><span style={mono}>{profile.id}</span><span>v{profile.version}</span><span>{profile.effectiveAt}</span><Pill tone={{ color: C.pass, bg: C.passSoft }}>{profile.status}</Pill></div>)}</div><div style={{ marginTop: 14, background: C.reviewSoft, color: C.review, borderRadius: 9, padding: 12, fontSize: 11 }}>Demo profiles are fictional and are not legal, compliance, investor or underwriting guidance. The next version will add draft → review → approve → publish and impact simulation.</div></main>;

  const Governance = () => {
    const allRules = reviews.flatMap((review) => review.rules);
    const total = allRules.length;
    const overrides = allRules.filter((rule) => rule.overridden).length;
    const lowConfidence = allRules.filter((rule) => rule.confidence.reviewTrigger).length;
    return <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}><h1 style={{ ...display }}>AI governance</h1><p style={{ color: C.sub, maxWidth: 760, fontSize: 13 }}>Assay illustrates controls that can support an AI governance program: human accountability, traceability, version pinning, performance monitoring and fail-safe decisioning. It does not claim that this demo alone satisfies Fannie Mae or other regulatory obligations.</p><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, margin: "18px 0" }}>{[["Rule evaluations", total], ["Human overrides", overrides], ["Low-confidence routes", lowConfidence], ["False-ready release gate", "0"], ["Live model calls", "0"], ["Synthetic scenarios", reviews.length]].map(([k,v]) => <div key={k} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ ...mono, color: C.sub, fontSize: 10 }}>{k.toUpperCase()}</div><div style={{ ...display, fontSize: 22, fontWeight: 800, marginTop: 5 }}>{v}</div></div>)}</section><div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}><b>Planned release gates</b><ul style={{ color: C.sub, lineHeight: 1.8, fontSize: 12 }}><li>Zero false-ready packages in the golden evaluation set.</li><li>Field and rule accuracy segmented by document type and scan quality.</li><li>P50/P95 latency and cost per package.</li><li>Model-version regression comparison before promotion.</li><li>Override and correction rates monitored by rule and jurisdiction.</li></ul></div></main>;
  };

  const OverrideModal = () => {
    if (modal?.type !== "override") return null;
    const rule = modal.rule;
    const requiresApproval = rule.severity === "Critical" && override.authorizedException;
    const valid = override.reason && (!requiresApproval || override.secondApproval);
    return <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "#12211d88", display: "grid", placeItems: "center", zIndex: 10 }}><div onClick={(event) => event.stopPropagation()} style={{ width: "min(520px,92vw)", background: C.panel, borderRadius: 12, padding: 20 }}><h2 style={{ ...display, marginTop: 0 }}>Review {rule.id}</h2><p style={{ color: C.sub, fontSize: 12 }}>System result: <b>{rule.status}</b>. Source evidence is pinned to {rule.evidence.sourceDocument}, page {rule.evidence.page}.</p><label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Reason<select value={override.reason} onChange={(event) => setOverride({ ...override, reason: event.target.value })} style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7 }}><option value="">Select…</option><option>Extraction error</option><option>Evidence found elsewhere</option><option>Wrong document classification</option><option>Acceptable variation</option><option>Policy exception</option></select></label><label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Analyst note<textarea rows={3} value={override.note} onChange={(event) => setOverride({ ...override, note: event.target.value })} style={{ padding: 9, border: `1px solid ${C.line}`, borderRadius: 7 }} /></label><label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, marginBottom: 10 }}><input type="checkbox" checked={override.authorizedException} onChange={(event) => setOverride({ ...override, authorizedException: event.target.checked })} />Record as formally authorized policy exception</label>{requiresApproval && <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.fail, marginBottom: 12 }}><input type="checkbox" checked={override.secondApproval} onChange={(event) => setOverride({ ...override, secondApproval: event.target.checked })} />Demo QC manager second approval</label>}<div style={{ display: "flex", gap: 8 }}><Button disabled={!valid} onClick={applyOverride}>Record evidence-backed action</Button><Button secondary onClick={() => setModal(null)}>Cancel</Button></div></div></div>;
  };

  return <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, ...display }}><Nav />{screen === "dashboard" && <Dashboard />}{screen === "review" && <Review />}{screen === "samples" && <Samples />}{screen === "profiles" && <Profiles />}{screen === "governance" && <Governance />}<OverrideModal /><footer style={{ ...mono, textAlign: "center", color: C.sub, fontSize: 10, padding: 24 }}>Assay · synthetic portfolio prototype · not legal or compliance advice</footer></div>;
}

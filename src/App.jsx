import React, { useState, useEffect, useRef } from "react";

/* ── Assay — Phase 1 interactive shell ─────────────────────────
   Synthetic data only. Independent portfolio prototype.
   Three status systems kept separate: system recommendation,
   workflow state, final analyst disposition.                            */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const C = {
  paper: "#F6F7F5", ink: "#16211D", sub: "#5B6763", line: "#E1E5E1",
  teal: "#0E5E56", tealSoft: "#E3EFED",
  pass: "#1B7A4A", passBg: "#E7F3EC",
  fail: "#B3312B", failBg: "#F9E9E8",
  rev: "#96660A", revBg: "#F7EEDA",
  na: "#6B7280", naBg: "#EEF0F1",
  auto: "#4C4699", autoBg: "#ECEBF6",
  white: "#FFFFFF",
};

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const disp = { fontFamily: "'Space Grotesk', sans-serif" };

const PROFILES = {
  baseline: "Baseline Demo Profile v1.0",
  enhanced: "Enhanced Verification Demo Profile v1.0",
};

const RULES_META = {
  "DOC-001": { name: "Required documents present", sev: "Critical" },
  "ID-001": { name: "Case ID consistent", sev: "Critical" },
  "NAME-001": { name: "Business name consistent", sev: "Critical" },
  "SIG-001": { name: "Authorized signer signature present", sev: "Critical" },
  "SIG-002": { name: "Guarantor signature present", sev: "Critical" },
  "DATE-001": { name: "Required execution dates present", sev: "Major" },
  "DATE-002": { name: "Date sequence valid", sev: "Major" },
  "NOT-001": { name: "Required acknowledgment fields present", sev: "Critical" },
  "NOT-002": { name: "Commission expiration valid", sev: "Critical" },
};

const r = (id, status, conf, doc, page, value, evidence) => ({
  id, ...RULES_META[id], version: "1.0", status, conf, doc, page, value, evidence,
  overridden: false, overrideReason: null, overrideNote: null, origStatus: status,
});

/* ── Three preloaded synthetic packages ── */
const seedReviews = [
  {
    reviewId: "RV-1041", caseId: "BL-20481", name: "Cedar & Sage Coffee Roasters LLC",
    profile: "baseline", createdAt: "09:12", analyzedAt: "09:13", procSecs: 11,
    docs: ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification"],
    recommendation: "Ready for Confirmation", workflow: "In Review", disposition: null,
    rules: [
      r("DOC-001", "Pass", 0.98, "Package", 1, "4 of 4 required documents", "All documents required by Baseline profile classified"),
      r("ID-001", "Pass", 0.99, "All documents", 1, "BL-20481", "Application ID: BL-20481 consistent across 4 documents"),
      r("NAME-001", "Pass", 0.97, "All documents", 1, "Cedar & Sage Coffee Roasters LLC", "Normalized name matched on 4 of 4 documents"),
      r("SIG-001", "Pass", 0.95, "Business Loan Agreement", 6, "Signature present", "Signature indicator detected in borrower execution block"),
      r("SIG-002", "Pass", 0.94, "Personal Guaranty", 3, "Signature present", "Signature indicator detected in guarantor execution block"),
      r("DATE-001", "Pass", 0.96, "Business Loan Agreement", 6, "2026-07-08", "Execution date parseable on all required documents"),
      r("DATE-002", "Pass", 0.96, "Package", 6, "All dates ≤ 2026-07-08", "No future-dated documents; sequence logic satisfied"),
      r("NOT-001", "N/A", null, "—", null, "—", "Baseline profile does not require notary acknowledgment"),
      r("NOT-002", "N/A", null, "—", null, "—", "Baseline profile does not require notary acknowledgment"),
    ],
    audit: [
      { t: "09:12", actor: "System", type: "auto", event: "Review created · profile Baseline v1.0" },
      { t: "09:12", actor: "System", type: "auto", event: "4 documents uploaded and validated" },
      { t: "09:13", actor: "System", type: "auto", event: "Analysis complete · 9 rules evaluated · recommendation: Ready for Confirmation" },
    ],
  },
  {
    reviewId: "RV-1038", caseId: "BL-20476", name: "Brightline Logistics LLC",
    profile: "baseline", createdAt: "08:47", analyzedAt: "08:48", procSecs: 13,
    docs: ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification"],
    recommendation: "Exception Identified", workflow: "In Review", disposition: null,
    rules: [
      r("DOC-001", "Pass", 0.98, "Package", 1, "4 of 4 required documents", "All documents required by Baseline profile classified"),
      r("ID-001", "Pass", 0.99, "All documents", 1, "BL-20476", "Application ID consistent across 4 documents"),
      r("NAME-001", "Pass", 0.96, "All documents", 1, "Brightline Logistics LLC", "Normalized name matched on 4 of 4 documents"),
      r("SIG-001", "Pass", 0.95, "Business Loan Agreement", 6, "Signature present", "Signature indicator detected in borrower execution block"),
      r("SIG-002", "Fail", 0.94, "Personal Guaranty", 3, "No signature detected", "Guarantor execution block is empty; no qualifying signature indicator found"),
      r("DATE-001", "Pass", 0.96, "Business Loan Agreement", 6, "2026-07-06", "Execution date parseable on all required documents"),
      r("DATE-002", "Fail", 0.93, "ACH Authorization", 2, "2026-08-14", "Authorization date is future-dated relative to review date 2026-07-06"),
      r("NOT-001", "N/A", null, "—", null, "—", "Baseline profile does not require notary acknowledgment"),
      r("NOT-002", "N/A", null, "—", null, "—", "Baseline profile does not require notary acknowledgment"),
    ],
    audit: [
      { t: "08:47", actor: "System", type: "auto", event: "Review created · profile Baseline v1.0" },
      { t: "08:47", actor: "System", type: "auto", event: "4 documents uploaded and validated" },
      { t: "08:48", actor: "System", type: "auto", event: "Analysis complete · 2 critical/major failures · recommendation: Exception Identified" },
    ],
  },
  {
    reviewId: "RV-1035", caseId: "BL-20492", name: "Marisol Home Health Services LLC",
    profile: "enhanced", createdAt: "08:15", analyzedAt: "08:16", procSecs: 14,
    docs: ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification", "Notary Acknowledgment"],
    recommendation: "Needs Review", workflow: "In Review", disposition: null,
    rules: [
      r("DOC-001", "Pass", 0.97, "Package", 1, "5 of 5 required documents", "All documents required by Enhanced profile classified"),
      r("ID-001", "Pass", 0.98, "All documents", 1, "BL-20492", "Application ID consistent across 5 documents"),
      r("NAME-001", "Pass", 0.95, "All documents", 1, "Marisol Home Health Services LLC", "Normalized name matched on 5 of 5 documents"),
      r("SIG-001", "Needs Review", 0.81, "Business Loan Agreement", 6, "Indicator ambiguous", "Low-quality scan; possible signature stroke detected below high-confidence threshold"),
      r("SIG-002", "Pass", 0.93, "Personal Guaranty", 3, "Signature present", "Signature indicator detected in guarantor execution block"),
      r("DATE-001", "Pass", 0.95, "Business Loan Agreement", 6, "2026-07-02", "Execution date parseable on all required documents"),
      r("DATE-002", "Pass", 0.95, "Package", 6, "All dates ≤ 2026-07-02", "No future-dated documents; sequence logic satisfied"),
      r("NOT-001", "Pass", 0.94, "Notary Acknowledgment", 1, "All fields present", "Acknowledgment, signer, notary name, commission expiration detected"),
      r("NOT-002", "Needs Review", 0.72, "Notary Acknowledgment", 1, "Expiration partially legible", "Commission expiration digits degraded by scan quality; cannot confirm date follows acknowledgment"),
    ],
    audit: [
      { t: "08:15", actor: "System", type: "auto", event: "Review created · profile Enhanced Verification v1.0" },
      { t: "08:15", actor: "System", type: "auto", event: "5 documents uploaded and validated" },
      { t: "08:16", actor: "System", type: "auto", event: "Analysis complete · 2 low-confidence critical findings routed to review · recommendation: Needs Review" },
    ],
  },
];

const OVERRIDE_REASONS = ["Extraction error", "Acceptable variation", "Wrong document classification", "Policy exception", "Evidence found elsewhere", "Other"];
const STAGES = ["Validating files", "Classifying documents", "Extracting fields", "Applying control rules", "Building evidence-backed results"];

const statusStyle = (s) => ({
  Pass: { c: C.pass, bg: C.passBg, i: "✓" },
  Fail: { c: C.fail, bg: C.failBg, i: "✕" },
  "Needs Review": { c: C.rev, bg: C.revBg, i: "⚠" },
  "N/A": { c: C.na, bg: C.naBg, i: "–" },
}[s]);

const recStyle = (rec) => ({
  "Ready for Confirmation": { c: C.pass, bg: C.passBg, i: "✓" },
  "Exception Identified": { c: C.fail, bg: C.failBg, i: "✕" },
  "Needs Review": { c: C.rev, bg: C.revBg, i: "⚠" },
  "Unable to Process": { c: C.na, bg: C.naBg, i: "⊘" },
}[rec] || { c: C.na, bg: C.naBg, i: "•" });

const Chip = ({ label, value, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <span style={{ ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.sub }}>{label}</span>
    <span style={{ ...disp, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: style.c, background: style.bg, border: `1px solid ${style.c}33`, padding: "5px 10px", borderRadius: 6, width: "fit-content" }}>
      <span aria-hidden>{style.i}</span>{value}
    </span>
  </div>
);

const ConfBar = ({ conf }) => conf == null ? <span style={{ ...mono, fontSize: 11, color: C.na }}>—</span> : (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 44, height: 5, background: C.line, borderRadius: 3, overflow: "hidden" }}>
      <span style={{ display: "block", width: `${conf * 100}%`, height: "100%", background: conf >= 0.92 ? C.pass : conf >= 0.75 ? C.rev : C.fail }} />
    </span>
    <span style={{ ...mono, fontSize: 11, color: C.sub }}>{conf.toFixed(2)}</span>
  </span>
);

function computeRecommendation(rules) {
  const active = rules.filter(x => x.status !== "N/A");
  const effStatus = x => x.status;
  if (active.some(x => effStatus(x) === "Fail")) return "Exception Identified";
  if (active.some(x => x.sev === "Critical" && effStatus(x) === "Needs Review")) return "Needs Review";
  if (active.some(x => effStatus(x) === "Needs Review")) return "Needs Review";
  return "Ready for Confirmation";
}

export default function Assay() {
  const [reviews, setReviews] = useState(seedReviews);
  const [screen, setScreen] = useState("dashboard"); // dashboard | new | processing | results | audit
  const [activeId, setActiveId] = useState(null);
  const [stage, setStage] = useState(0);
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null); // {type:'override'|'return'|'escalate'|'confirm', rule?}
  const [form, setForm] = useState({});
  const [newForm, setNewForm] = useState({ caseId: "", name: "", profile: "baseline", files: [], ack: false });
  const timer = useRef(null);

  const active = reviews.find(x => x.reviewId === activeId);

  useEffect(() => () => clearInterval(timer.current), []);

  const update = (id, fn) => setReviews(rs => rs.map(x => x.reviewId === id ? fn(structuredClone(x)) : x));
  const addAudit = (rv, actor, type, event) => { rv.audit.push({ t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor, type, event }); return rv; };

  const openReview = (id) => { setActiveId(id); setFilter("All"); setScreen("results"); };

  const startAnalysis = (targetId, isNew) => {
    setScreen("processing"); setStage(0);
    let s = 0;
    timer.current = setInterval(() => {
      s += 1;
      if (s >= STAGES.length) { clearInterval(timer.current); openReview(targetId); }
      else setStage(s);
    }, 700);
  };

  const createReview = () => {
    const id = "RV-" + (1042 + reviews.length);
    const tmpl = structuredClone(seedReviews[0]);
    const rv = {
      ...tmpl, reviewId: id,
      caseId: newForm.caseId || "BL-DEMO-" + (100 + reviews.length),
      name: newForm.name || "Uploaded Demo Package",
      profile: newForm.profile,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      analyzedAt: "", procSecs: 12, workflow: "In Review", disposition: null,
      docs: newForm.files.length ? newForm.files : tmpl.docs,
      audit: [
        { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "System", type: "auto", event: `Review created · profile ${PROFILES[newForm.profile]}` },
        { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "System", type: "auto", event: "Phase 1 shell: deterministic demo analysis applied (live extraction ships in Phase 2/3)" },
      ],
    };
    if (newForm.profile === "enhanced") {
      rv.rules = rv.rules.map(x => x.id.startsWith("NOT")
        ? { ...x, status: "Fail", conf: 0.95, doc: "Package", page: null, value: "Not found", evidence: "Enhanced profile requires notary acknowledgment; none classified in package", origStatus: "Fail" }
        : x);
      rv.recommendation = computeRecommendation(rv.rules);
    }
    setReviews(rs => [rv, ...rs]);
    setNewForm({ caseId: "", name: "", profile: "baseline", files: [], ack: false });
    startAnalysis(id, true);
  };

  /* ── actions ── */
  const applyOverride = () => {
    const { rule } = modal;
    update(activeId, rv => {
      const q = rv.rules.find(x => x.id === rule.id);
      q.overridden = true; q.origStatus = q.origStatus || q.status;
      q.status = form.newStatus || "Pass";
      q.overrideReason = form.reason; q.overrideNote = form.note || null;
      rv.recommendation = computeRecommendation(rv.rules);
      return addAudit(rv, "Demo Analyst", "human", `Override ${q.id}: ${q.origStatus} → ${q.status} · reason: ${form.reason}${form.note ? " · " + form.note : ""}`);
    });
    setModal(null); setForm({});
  };

  const applyReturn = () => {
    const failed = active.rules.filter(x => x.status === "Fail" || x.status === "Needs Review").map(x => x.id);
    update(activeId, rv => {
      rv.workflow = "Returned"; rv.disposition = "Correction Required";
      return addAudit(rv, "Demo Analyst", "human", `Returned for correction · findings: ${failed.join(", ")} · structured summary generated`);
    });
    setModal(null);
  };

  const applyEscalate = () => {
    update(activeId, rv => {
      rv.workflow = "Escalated"; rv.disposition = "Escalated";
      return addAudit(rv, "Demo Analyst", "human", `Escalated · category: ${form.cat || "Specialized review"} · ${form.note || ""}`);
    });
    setModal(null); setForm({});
  };

  const unresolvedCriticals = active ? active.rules.filter(x => x.sev === "Critical" && (x.status === "Fail" || x.status === "Needs Review")) : [];

  const applyConfirm = () => {
    update(activeId, rv => {
      rv.workflow = "Completed"; rv.disposition = "Ready for Funding";
      return addAudit(rv, "Demo Analyst", "human", "Recommendation confirmed · final analyst disposition: Ready for Funding");
    });
    setModal(null);
  };

  /* ── shared UI ── */
  const Btn = ({ children, kind = "primary", onClick, disabled, small }) => (
    <button onClick={onClick} disabled={disabled} style={{
      ...disp, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600,
      fontSize: small ? 12 : 13, padding: small ? "6px 12px" : "9px 16px", borderRadius: 7,
      border: kind === "primary" ? "none" : `1px solid ${C.line}`,
      background: disabled ? C.naBg : kind === "primary" ? C.teal : kind === "danger" ? C.failBg : C.white,
      color: disabled ? C.na : kind === "primary" ? "#fff" : kind === "danger" ? C.fail : C.ink,
    }}>{children}</button>
  );

  const Nav = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${C.line}`, background: C.white }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setScreen("dashboard")}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: C.teal, color: "#fff", display: "grid", placeItems: "center", ...disp, fontWeight: 700 }}>AY</div>
        <div>
          <div style={{ ...disp, fontWeight: 700, fontSize: 15, color: C.ink }}>Assay</div>
          <div style={{ ...mono, fontSize: 10, color: C.sub }}>AI-enabled QC workstation · prototype</div>
        </div>
      </div>
      <div style={{ ...mono, fontSize: 10, color: C.sub, textAlign: "right" }}>
        Synthetic data only · independent portfolio prototype<br />No employer or client information
      </div>
    </div>
  );

  /* ── Screen 1: Dashboard ── */
  const Dashboard = () => {
    const total = reviews.length;
    const ready = reviews.filter(x => x.recommendation === "Ready for Confirmation").length;
    const exc = reviews.filter(x => x.recommendation === "Exception Identified").length;
    const rev = reviews.filter(x => x.recommendation === "Needs Review").length;
    const overrides = reviews.reduce((a, x) => a + x.rules.filter(q => q.overridden).length, 0);
    const kpis = [
      ["Packages processed", total], ["Ready rate", Math.round(ready / total * 100) + "%"],
      ["Exception rate", Math.round(exc / total * 100) + "%"], ["Needs-review queue", rev],
      ["Median handling time", "4.0 min"], ["Override count", overrides],
    ];
    return (
      <div style={{ padding: 24, maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 18 }}>
          <div>
            <h1 style={{ ...disp, fontSize: 22, fontWeight: 700, margin: 0, color: C.ink }}>Operations dashboard</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.sub }}>Funding-package quality control · demo data</p>
          </div>
          <Btn onClick={() => setScreen("new")}>+ New review</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
          {kpis.map(([k, v]) => (
            <div key={k} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: C.sub }}>{k}</div>
              <div style={{ ...disp, fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.line}`, ...disp, fontWeight: 600, fontSize: 13 }}>Recent reviews</div>
          {reviews.map(x => {
            const rs = recStyle(x.recommendation);
            return (
              <div key={x.reviewId} onClick={() => openReview(x.reviewId)} style={{ display: "grid", gridTemplateColumns: "90px 110px 1fr 190px 130px 110px", gap: 10, alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <span style={{ ...mono, fontSize: 12, color: C.sub }}>{x.reviewId}</span>
                <span style={{ ...mono, fontSize: 12, color: C.ink }}>{x.caseId}</span>
                <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{x.name}</span>
                <span style={{ ...disp, fontSize: 12, fontWeight: 600, color: rs.c }}>{rs.i} {x.recommendation}</span>
                <span style={{ ...mono, fontSize: 11, color: C.sub }}>{x.workflow}</span>
                <span style={{ ...mono, fontSize: 11, color: x.disposition ? C.teal : C.na }}>{x.disposition || "—"}</span>
              </div>
            );
          })}
          <div style={{ padding: "8px 16px", ...mono, fontSize: 10, color: C.sub }}>columns: system recommendation · workflow state · analyst disposition — three separate status systems</div>
        </div>
      </div>
    );
  };

  /* ── Screen 2: New review ── */
  const NewReview = () => (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ ...disp, fontSize: 20, fontWeight: 700, color: C.ink }}>New package review</h1>
      <div style={{ background: C.revBg, border: `1px solid ${C.rev}44`, color: C.rev, borderRadius: 8, padding: "10px 14px", fontSize: 12, margin: "12px 0" }}>
        ⚠ Synthetic documents only. This prototype must not receive real personal or financial information. Uploads are processed ephemerally and not persisted.
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Case ID
          <input value={newForm.caseId} onChange={e => setNewForm({ ...newForm, caseId: e.target.value })} placeholder="Auto-generated if left blank — e.g. BL-20499" style={{ ...mono, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13 }} />
          <span style={{ fontSize: 11, color: C.sub }}>In production this arrives from the loan-origination system; entering one manually is only for this demo.</span>
        </label>
        <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Package display name
          <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="Synthetic Business LLC" style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13 }} />
        </label>
        <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Demo policy profile *
          <select value={newForm.profile} onChange={e => setNewForm({ ...newForm, profile: e.target.value })} style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, background: C.white }}>
            <option value="baseline">Baseline Demo Profile v1.0 (notary not required)</option>
            <option value="enhanced">Enhanced Verification Demo Profile v1.0 (notary required)</option>
          </select>
        </label>
        <div onClick={() => setNewForm({ ...newForm, files: ["Business Loan Agreement.pdf", "Personal Guaranty.pdf", "ACH Authorization.pdf", "Borrower Certification.pdf"] })}
          style={{ border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: 22, textAlign: "center", cursor: "pointer", color: C.sub, fontSize: 13 }}>
          {newForm.files.length ? newForm.files.map(f => <div key={f} style={{ ...mono, fontSize: 12, color: C.ink }}>{f}</div>) : <>Drag & drop up to 5 PDFs (≤25 pages) — click to simulate an upload<br /><span style={{ fontSize: 11 }}>Supported: Loan Agreement, Guaranty, ACH Authorization, Certification, Notary Ack</span></>}
        </div>
        <label style={{ display: "flex", gap: 8, fontSize: 12, color: C.ink, alignItems: "start" }}>
          <input type="checkbox" checked={newForm.ack} onChange={e => setNewForm({ ...newForm, ack: e.target.checked })} />
          I confirm these files contain no real personal or financial information.
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={createReview} disabled={!newForm.ack}>Analyze package</Btn>
          <Btn kind="ghost" onClick={() => setScreen("dashboard")}>Cancel</Btn>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={{ ...disp, fontWeight: 600, fontSize: 13, marginBottom: 8, color: C.ink }}>Or open a preloaded sample package</div>
        <div style={{ display: "grid", gap: 8 }}>
          {seedReviews.map(x => {
            const rs = recStyle(x.recommendation);
            return (
              <div key={x.reviewId} onClick={() => startAnalysis(x.reviewId)} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 14px", display: "flex", justifyContent: "space-between", cursor: "pointer", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{x.name} <span style={{ ...mono, fontSize: 11, color: C.sub }}>· {x.caseId} · {PROFILES[x.profile].replace(" Demo Profile", "")}</span></span>
                <span style={{ ...disp, fontSize: 12, fontWeight: 600, color: rs.c }}>{rs.i} {x.recommendation}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ── Screen 3: Processing ── */
  const Processing = () => (
    <div style={{ padding: 60, maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ ...disp, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Analyzing package</h1>
      <p style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>Automated checks only — an analyst makes the final disposition. This is not legal validation.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, background: i < stage ? C.passBg : i === stage ? C.tealSoft : C.naBg, color: i < stage ? C.pass : i === stage ? C.teal : C.na, border: `1px solid ${i <= stage ? (i < stage ? C.pass : C.teal) : C.line}` }}>{i < stage ? "✓" : i + 1}</span>
            <span style={{ fontSize: 13, color: i <= stage ? C.ink : C.sub, fontWeight: i === stage ? 600 : 400 }}>{s}{i === stage && "…"}</span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Screen 4: Results workspace ── */
  const Results = () => {
    if (!active) return null;
    const rs = recStyle(active.recommendation);
    const order = { Fail: 0, "Needs Review": 1, Pass: 2, "N/A": 3 };
    const shown = active.rules
      .filter(x => filter === "All" ? true : x.status === filter)
      .sort((a, b) => order[a.status] - order[b.status]);
    const counts = ["Fail", "Needs Review", "Pass", "N/A"].map(s => [s, active.rules.filter(x => x.status === s).length]);
    return (
      <div style={{ padding: 24, maxWidth: 1080, margin: "0 auto" }}>
        <button onClick={() => setScreen("dashboard")} style={{ ...mono, fontSize: 11, background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 0, marginBottom: 10 }}>← dashboard</button>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{ ...disp, fontSize: 19, fontWeight: 700, margin: 0, color: C.ink }}>{active.name}</h1>
              <div style={{ ...mono, fontSize: 11, color: C.sub, marginTop: 4 }}>
                {active.reviewId} · {active.caseId} · {PROFILES[active.profile]} · rules v1.0 · processed in {active.procSecs}s
              </div>
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              <Chip label="System recommendation" value={active.recommendation} style={rs} />
              <Chip label="Workflow state" value={active.workflow} style={{ c: C.auto, bg: C.autoBg, i: "◷" }} />
              <Chip label="Final analyst disposition" value={active.disposition || "Pending"} style={active.disposition ? { c: C.teal, bg: C.tealSoft, i: "✍" } : { c: C.na, bg: C.naBg, i: "…" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Btn small onClick={() => setModal({ type: "confirm" })} disabled={!!active.disposition}>Confirm recommendation</Btn>
            <Btn small kind="ghost" onClick={() => setModal({ type: "return" })} disabled={!!active.disposition}>Return for correction</Btn>
            <Btn small kind="ghost" onClick={() => { setForm({}); setModal({ type: "escalate" }); }} disabled={!!active.disposition}>Escalate</Btn>
            <Btn small kind="ghost" onClick={() => setScreen("audit")}>Audit history</Btn>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {["All", "Fail", "Needs Review", "Pass", "N/A"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...mono, fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${filter === f ? C.teal : C.line}`, background: filter === f ? C.tealSoft : C.white, color: filter === f ? C.teal : C.sub }}>
              {f}{f !== "All" && ` (${counts.find(c => c[0] === f)[1]})`}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {shown.map(x => {
            const ss = statusStyle(x.status);
            return (
              <div key={x.id} style={{ background: C.white, border: `1px solid ${x.sev === "Critical" && (x.status === "Fail" || x.status === "Needs Review") ? ss.c + "66" : C.line}`, borderLeft: `4px solid ${ss.c}`, borderRadius: 9, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ ...mono, fontSize: 11, color: C.sub, background: C.paper, border: `1px solid ${C.line}`, padding: "2px 7px", borderRadius: 5 }}>{x.id} v{x.version}</span>
                    <span style={{ ...disp, fontSize: 13, fontWeight: 600, color: C.ink }}>{x.name}</span>
                    <span style={{ ...mono, fontSize: 10, color: x.sev === "Critical" ? C.fail : C.rev }}>{x.sev.toUpperCase()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <ConfBar conf={x.conf} />
                    <span style={{ ...disp, fontSize: 12, fontWeight: 600, color: ss.c, background: ss.bg, padding: "3px 9px", borderRadius: 5 }}>{ss.i} {x.status}</span>
                    {x.status !== "N/A" && !active.disposition && (
                      <Btn small kind="ghost" onClick={() => { setForm({ newStatus: x.status === "Pass" ? "Fail" : "Pass", reason: "" }); setModal({ type: "override", rule: x }); }}>Override</Btn>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12.5, color: C.ink }}>
                  <span style={{ color: C.sub }}>Evidence: </span>{x.evidence}
                </div>
                <div style={{ ...mono, fontSize: 11, color: C.sub, marginTop: 4 }}>
                  {x.doc}{x.page ? ` · page ${x.page}` : ""} · extracted: {x.value}
                  {x.overridden && <span style={{ color: C.auto }}> · overridden by analyst ({x.overrideReason}) — original: {x.origStatus}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Screen 6: Audit history ── */
  const Audit = () => (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <button onClick={() => setScreen("results")} style={{ ...mono, fontSize: 11, background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 0, marginBottom: 10 }}>← results</button>
      <h1 style={{ ...disp, fontSize: 19, fontWeight: 700, color: C.ink }}>Audit history — {active?.reviewId}</h1>
      <p style={{ fontSize: 12, color: C.sub }}>Every automated and human event, chronologically. Nothing is silently replaced.</p>
      <div style={{ display: "grid", gap: 0, marginTop: 12 }}>
        {active?.audit.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ ...mono, fontSize: 11, color: C.sub, width: 44 }}>{e.t}</span>
            <span style={{ ...disp, fontSize: 11, fontWeight: 600, color: e.type === "auto" ? C.auto : C.teal, background: e.type === "auto" ? C.autoBg : C.tealSoft, padding: "2px 8px", borderRadius: 5, height: "fit-content" }}>{e.type === "auto" ? "AUTOMATED" : "HUMAN"}</span>
            <span style={{ fontSize: 12.5, color: C.ink }}>{e.event} <span style={{ ...mono, fontSize: 10, color: C.sub }}>· {e.actor}</span></span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Btn small kind="ghost" onClick={() => alert(JSON.stringify(active.audit, null, 2))}>Export JSON</Btn>
      </div>
    </div>
  );

  /* ── Screen 5: modals (override / return / escalate / confirm) ── */
  const Modal = () => {
    if (!modal) return null;
    const box = { background: C.white, borderRadius: 12, padding: 22, width: "min(480px, 92vw)", border: `1px solid ${C.line}` };
    const wrap = { position: "fixed", inset: 0, background: "#16211D66", display: "grid", placeItems: "center", zIndex: 50 };
    if (modal.type === "override") {
      const x = modal.rule;
      const needNote = form.reason === "Other" || form.reason === "Policy exception";
      return (
        <div style={wrap} onClick={() => setModal(null)}>
          <div style={box} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...disp, fontSize: 16, fontWeight: 700, margin: 0 }}>Override {x.id} — {x.name}</h2>
            <div style={{ ...mono, fontSize: 11, color: C.sub, margin: "8px 0 14px" }}>Original result: {x.status} · conf {x.conf?.toFixed(2)} · the original finding is preserved in history.</div>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, marginBottom: 10 }}>New result
              <select value={form.newStatus} onChange={e => setForm({ ...form, newStatus: e.target.value })} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7 }}>
                {["Pass", "Fail", "Needs Review"].filter(s => s !== x.status).map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, marginBottom: 10 }}>Reason (required)
              <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7 }}>
                <option value="">Select a reason…</option>
                {OVERRIDE_REASONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, marginBottom: 14 }}>Notes {needNote ? "(required)" : "(optional)"}
              <textarea value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={applyOverride} disabled={!form.reason || (needNote && !form.note)}>Record override</Btn>
              <Btn kind="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      );
    }
    if (modal.type === "return") {
      const findings = active.rules.filter(x => x.status === "Fail" || x.status === "Needs Review");
      return (
        <div style={wrap} onClick={() => setModal(null)}>
          <div style={box} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...disp, fontSize: 16, fontWeight: 700, margin: 0 }}>Return for correction</h2>
            <p style={{ fontSize: 12, color: C.sub }}>Structured correction summary — failed and needs-review findings are pre-selected:</p>
            {findings.map(x => (
              <div key={x.id} style={{ fontSize: 12, padding: "7px 10px", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 7, marginBottom: 6 }}>
                <span style={{ ...mono }}>{x.id}</span> · {x.doc}{x.page ? ` p.${x.page}` : ""} — {x.evidence}
              </div>
            ))}
            {findings.length === 0 && <div style={{ fontSize: 12, color: C.sub }}>No open findings — nothing to return.</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn onClick={applyReturn} disabled={!findings.length}>Return package</Btn>
              <Btn kind="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      );
    }
    if (modal.type === "escalate") {
      return (
        <div style={wrap} onClick={() => setModal(null)}>
          <div style={box} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...disp, fontSize: 16, fontWeight: 700, margin: 0 }}>Escalate for specialized review</h2>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, margin: "12px 0 10px" }}>Category (required)
              <select value={form.cat || ""} onChange={e => setForm({ ...form, cat: e.target.value })} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7 }}>
                <option value="">Select…</option>
                {["Document quality", "Possible alteration", "Policy interpretation", "Other"].map(o => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, marginBottom: 14 }}>Notes (required)
              <textarea value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={applyEscalate} disabled={!form.cat || !form.note}>Escalate</Btn>
              <Btn kind="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      );
    }
    if (modal.type === "confirm") {
      const blocked = unresolvedCriticals.length > 0;
      return (
        <div style={wrap} onClick={() => setModal(null)}>
          <div style={box} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...disp, fontSize: 16, fontWeight: 700, margin: 0 }}>Confirm recommendation</h2>
            {blocked ? (
              <>
                <div style={{ background: C.failBg, border: `1px solid ${C.fail}44`, color: C.fail, borderRadius: 8, padding: "10px 12px", fontSize: 12, margin: "12px 0" }}>
                  ✕ A "Ready for Funding" disposition is blocked: {unresolvedCriticals.length} unresolved critical finding(s) — {unresolvedCriticals.map(x => x.id).join(", ")}. Resolve via override (with reason), return for correction, or escalate.
                </div>
                <Btn kind="ghost" onClick={() => setModal(null)}>Back</Btn>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: C.ink }}>Final analyst disposition will be recorded as <b>Ready for Funding</b> — a human decision, distinct from the system recommendation. This action is logged with your identity and timestamp.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={applyConfirm}>Record disposition</Btn>
                  <Btn kind="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{FONTS}</style>
      <Nav />
      {screen === "dashboard" && Dashboard()}
      {screen === "new" && NewReview()}
      {screen === "processing" && Processing()}
      {screen === "results" && Results()}
      {screen === "audit" && Audit()}
      {Modal()}
      <div style={{ textAlign: "center", padding: "18px 0 26px", ...mono, fontSize: 10, color: C.sub }}>
        Assay · Phase 1 interactive shell · deterministic demo outputs · not legal or compliance advice
      </div>
    </div>
  );
}

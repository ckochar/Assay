import React, { useState } from "react";

/* ── Assay — Phase 1.5: configurable jurisdiction rules engine ─────────
   Synthetic data only. Independent portfolio prototype.
   Rules are computed live from package data + editable state profiles —
   not hardcoded per review. Positioning: Assay verifies the resulting
   document package after notarization; it is not a notarization/RON
   platform (that's Snapdocs/Pavaso/Proof's job).                       */

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
  gov: "#0B5C8A", govBg: "#E5F0F7",
  white: "#FFFFFF",
};
const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const disp = { fontFamily: "'Space Grotesk', sans-serif" };

/* ── Jurisdiction data (editable at runtime via Rule Profile Manager) ── */
const STATE_LABELS = { TX: "Texas", CA: "California", FL: "Florida" };
const DEFAULT_STATE_PARAMS = {
  TX: { witnessMin: 0, requireCommissionNumber: false, requireStatutoryWording: false },
  CA: { witnessMin: 0, requireCommissionNumber: false, requireStatutoryWording: true },
  FL: { witnessMin: 2, requireCommissionNumber: true, requireStatutoryWording: false },
};

const RULES_META = {
  "DOC-001": { name: "Required documents present", sev: "Critical" },
  "ID-001": { name: "Case ID consistent", sev: "Critical" },
  "NAME-001": { name: "Business name consistent", sev: "Critical" },
  "SIG-001": { name: "Authorized signer signature present", sev: "Critical" },
  "SIG-002": { name: "Guarantor signature present", sev: "Critical" },
  "DATE-001": { name: "Required execution dates present", sev: "Major" },
  "DATE-002": { name: "Date sequence valid", sev: "Major" },
  "WIT-001": { name: "Witness count meets jurisdiction minimum", sev: "Critical" },
  "NOT-001": { name: "Required notary acknowledgment fields present", sev: "Critical" },
  "NOT-002": { name: "Commission expiration valid", sev: "Critical" },
};
const RULE_ORDER = ["DOC-001", "ID-001", "NAME-001", "SIG-001", "SIG-002", "DATE-001", "DATE-002", "WIT-001", "NOT-001", "NOT-002"];

/* ── Rule template evaluators — the "rules as data" engine ── */
function evalDocCompleteness(pkg) {
  const required = ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification", ...(pkg.notarizationRequired ? ["Notary Acknowledgment"] : [])];
  const missing = required.filter(d => !pkg.documents.includes(d));
  return missing.length
    ? { status: "Fail", conf: 0.98, doc: "Package", page: 1, value: `${required.length - missing.length} of ${required.length} required documents`, evidence: `Missing: ${missing.join(", ")}` }
    : { status: "Pass", conf: 0.98, doc: "Package", page: 1, value: `${required.length} of ${required.length} required documents`, evidence: "All documents required for this package classified" };
}
function evalIdConsistency(pkg) {
  const vals = Object.values(pkg.caseIds);
  const ok = vals.every(v => v === vals[0]);
  return ok
    ? { status: "Pass", conf: 0.99, doc: "All documents", page: 1, value: vals[0], evidence: `Case ID ${vals[0]} consistent across ${vals.length} documents` }
    : { status: "Fail", conf: 0.97, doc: "All documents", page: 1, value: vals.join(" / "), evidence: "Case ID does not match across documents" };
}
function evalNameConsistency(pkg) {
  const vals = Object.values(pkg.names);
  const norm = s => s.trim().toLowerCase().replace(/[.,]/g, "");
  const ok = vals.every(v => norm(v) === norm(vals[0]));
  return ok
    ? { status: "Pass", conf: 0.96, doc: "All documents", page: 1, value: vals[0], evidence: `Normalized business name matched on ${vals.length} of ${vals.length} documents` }
    : { status: "Fail", conf: 0.95, doc: "All documents", page: 1, value: vals.join(" / "), evidence: "Business name does not match across documents" };
}
function evalSignature(sig) {
  const status = !sig.present ? "Fail" : sig.conf >= 0.92 ? "Pass" : "Needs Review";
  const evidence = !sig.present ? "Execution block is empty; no qualifying signature indicator found"
    : sig.conf >= 0.92 ? "Signature indicator detected in execution block"
    : "Low-quality scan; possible signature stroke detected below high-confidence threshold";
  return { status, conf: sig.conf, doc: sig.doc, page: sig.page, value: sig.present ? "Signature present" : "No signature detected", evidence };
}
function evalDatesPresent(pkg) {
  return pkg.executionDate
    ? { status: "Pass", conf: 0.96, doc: "Business Loan Agreement", page: 6, value: pkg.executionDate, evidence: "Execution date parseable on all required documents" }
    : { status: "Fail", conf: 0.9, doc: "Business Loan Agreement", page: 6, value: "—", evidence: "Execution date missing or unparseable" };
}
function evalDateSequence(pkg) {
  const exec = new Date(pkg.executionDate), ach = new Date(pkg.achDate);
  const future = ach > exec;
  return future
    ? { status: "Fail", conf: 0.93, doc: "ACH Authorization", page: 2, value: pkg.achDate, evidence: `Authorization date is future-dated relative to execution date ${pkg.executionDate}` }
    : { status: "Pass", conf: 0.96, doc: "Package", page: 6, value: `All dates \u2264 ${pkg.executionDate}`, evidence: "No future-dated documents; sequence logic satisfied" };
}
function evalWitnessCount(pkg, params) {
  if (!pkg.notarizationRequired) return { status: "N/A", conf: null, doc: "—", page: null, value: "—", evidence: "Notarized execution not required for this package" };
  const n = pkg.notary?.witnessCount, conf = pkg.notary?.witnessConf ?? 0.9;
  if (n == null) return { status: "Needs Review", conf: 0.6, doc: "Notary Acknowledgment", page: 1, value: "Not detected", evidence: "Witness count could not be determined from the acknowledgment" };
  if (conf < 0.75) return { status: "Needs Review", conf, doc: "Notary Acknowledgment", page: 1, value: `${n} (low confidence)`, evidence: "Witness count detected but confidence is below the review threshold" };
  return n >= params.witnessMin
    ? { status: "Pass", conf, doc: "Notary Acknowledgment", page: 1, value: `${n} witness(es)`, evidence: `Meets minimum of ${params.witnessMin} for this jurisdiction` }
    : { status: "Fail", conf, doc: "Notary Acknowledgment", page: 1, value: `${n} witness(es)`, evidence: `Below jurisdiction minimum of ${params.witnessMin}` };
}
function evalNotaryFields(pkg, params) {
  if (!pkg.notarizationRequired) return { status: "N/A", conf: null, doc: "—", page: null, value: "—", evidence: "Notarized execution not required for this package" };
  const nt = pkg.notary;
  if (!nt) return { status: "Fail", conf: 0.95, doc: "Package", page: null, value: "Not found", evidence: "Notarization required but no acknowledgment classified in package" };
  const required = [
    { key: "ackDate", label: "acknowledgment date", present: !!nt.ackDate, conf: 0.95 },
    { key: "notaryName", label: "notary name", present: nt.notaryName?.present, conf: nt.notaryName?.conf ?? 0.9 },
    { key: "commissionExpiration", label: "commission expiration", present: nt.commissionExpiration?.present, conf: nt.commissionExpiration?.conf ?? 0.9 },
    ...(params.requireCommissionNumber ? [{ key: "commissionNumber", label: "commission number", present: nt.commissionNumber?.present, conf: nt.commissionNumber?.conf ?? 0.9 }] : []),
    ...(params.requireStatutoryWording ? [{ key: "statutoryWording", label: "statutory acknowledgment wording", present: nt.statutoryWording?.present, conf: nt.statutoryWording?.conf ?? 0.9 }] : []),
  ];
  const missing = required.filter(f => !f.present);
  const lowConf = required.filter(f => f.present && f.conf < 0.75);
  const minConf = Math.min(...required.map(f => f.conf));
  if (missing.length) return { status: "Fail", conf: minConf, doc: "Notary Acknowledgment", page: 1, value: `Missing: ${missing.map(f => f.label).join(", ")}`, evidence: `Jurisdiction requires: ${required.map(f => f.label).join(", ")}` };
  if (lowConf.length) return { status: "Needs Review", conf: minConf, doc: "Notary Acknowledgment", page: 1, value: `Degraded: ${lowConf.map(f => f.label).join(", ")}`, evidence: "Required field(s) present but scan quality is below the review threshold" };
  return { status: "Pass", conf: minConf, doc: "Notary Acknowledgment", page: 1, value: "All required fields present", evidence: `Jurisdiction fields verified: ${required.map(f => f.label).join(", ")}` };
}
function evalCommissionExpiry(pkg) {
  if (!pkg.notarizationRequired) return { status: "N/A", conf: null, doc: "—", page: null, value: "—", evidence: "Notarized execution not required for this package" };
  const nt = pkg.notary;
  if (!nt || !nt.commissionExpiration?.present) return { status: "Fail", conf: 0.9, doc: "Notary Acknowledgment", page: 1, value: "—", evidence: "Commission expiration not found" };
  const conf = nt.commissionExpiration.conf;
  if (conf < 0.75) return { status: "Needs Review", conf, doc: "Notary Acknowledgment", page: 1, value: "Partially legible", evidence: "Commission expiration digits degraded by scan quality; cannot confirm date sequence" };
  const exp = new Date(nt.commissionExpiration.value), ack = new Date(nt.ackDate);
  return exp > ack
    ? { status: "Pass", conf, doc: "Notary Acknowledgment", page: 1, value: nt.commissionExpiration.value, evidence: "Commission expiration falls after the acknowledgment date" }
    : { status: "Fail", conf, doc: "Notary Acknowledgment", page: 1, value: nt.commissionExpiration.value, evidence: "Commission expiration is on or before the acknowledgment date" };
}
function buildRules(pkg, params) {
  const mk = (id, res) => ({ id, ...RULES_META[id], version: "1.0", ...res });
  return [
    mk("DOC-001", evalDocCompleteness(pkg)), mk("ID-001", evalIdConsistency(pkg)), mk("NAME-001", evalNameConsistency(pkg)),
    mk("SIG-001", evalSignature(pkg.signer)), mk("SIG-002", evalSignature(pkg.guarantor)),
    mk("DATE-001", evalDatesPresent(pkg)), mk("DATE-002", evalDateSequence(pkg)),
    mk("WIT-001", evalWitnessCount(pkg, params)), mk("NOT-001", evalNotaryFields(pkg, params)), mk("NOT-002", evalCommissionExpiry(pkg)),
  ];
}
function computeRecommendation(rules) {
  const active = rules.filter(x => x.status !== "N/A");
  if (active.some(x => x.status === "Fail")) return "Exception Identified";
  if (active.some(x => x.status === "Needs Review")) return "Needs Review";
  return "Ready for Confirmation";
}

/* ── Three preloaded synthetic packages (raw structured package data, not pre-baked rules) ── */
const seedReviews = [
  {
    reviewId: "RV-1041", caseId: "BL-20481", name: "Cedar & Sage Coffee Roasters LLC", stateId: "TX",
    createdAt: "09:12", procSecs: 11, workflow: "In Review", disposition: null, overrides: {},
    pkg: {
      documents: ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification"],
      caseIds: { a: "BL-20481", b: "BL-20481", c: "BL-20481", d: "BL-20481" },
      names: { a: "Cedar & Sage Coffee Roasters LLC", b: "Cedar & Sage Coffee Roasters LLC", c: "Cedar & Sage Coffee Roasters LLC", d: "Cedar & Sage Coffee Roasters LLC" },
      signer: { present: true, conf: 0.95, doc: "Business Loan Agreement", page: 6 },
      guarantor: { present: true, conf: 0.94, doc: "Personal Guaranty", page: 3 },
      executionDate: "2026-07-08", achDate: "2026-07-08", notarizationRequired: false, notary: null,
    },
    audit: [
      { t: "09:12", actor: "System", type: "auto", event: "Review created \u00b7 jurisdiction Texas \u00b7 notarization not required" },
      { t: "09:12", actor: "System", type: "auto", event: "4 documents uploaded and validated" },
      { t: "09:13", actor: "System", type: "auto", event: "Analysis complete \u00b7 10 rules evaluated" },
    ],
  },
  {
    reviewId: "RV-1038", caseId: "BL-20476", name: "Brightline Logistics LLC", stateId: "TX",
    createdAt: "08:47", procSecs: 13, workflow: "In Review", disposition: null, overrides: {},
    pkg: {
      documents: ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification"],
      caseIds: { a: "BL-20476", b: "BL-20476", c: "BL-20476", d: "BL-20476" },
      names: { a: "Brightline Logistics LLC", b: "Brightline Logistics LLC", c: "Brightline Logistics LLC", d: "Brightline Logistics LLC" },
      signer: { present: true, conf: 0.95, doc: "Business Loan Agreement", page: 6 },
      guarantor: { present: false, conf: 0.94, doc: "Personal Guaranty", page: 3 },
      executionDate: "2026-07-06", achDate: "2026-08-14", notarizationRequired: false, notary: null,
    },
    audit: [
      { t: "08:47", actor: "System", type: "auto", event: "Review created \u00b7 jurisdiction Texas \u00b7 notarization not required" },
      { t: "08:47", actor: "System", type: "auto", event: "4 documents uploaded and validated" },
      { t: "08:48", actor: "System", type: "auto", event: "Analysis complete \u00b7 2 critical/major failures found" },
    ],
  },
  {
    reviewId: "RV-1035", caseId: "BL-20492", name: "Marisol Home Health Services LLC", stateId: "FL",
    createdAt: "08:15", procSecs: 14, workflow: "In Review", disposition: null, overrides: {},
    pkg: {
      documents: ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification", "Notary Acknowledgment"],
      caseIds: { a: "BL-20492", b: "BL-20492", c: "BL-20492", d: "BL-20492", e: "BL-20492" },
      names: { a: "Marisol Home Health Services LLC", b: "Marisol Home Health Services LLC", c: "Marisol Home Health Services LLC", d: "Marisol Home Health Services LLC", e: "Marisol Home Health Services LLC" },
      signer: { present: true, conf: 0.81, doc: "Business Loan Agreement", page: 6 },
      guarantor: { present: true, conf: 0.93, doc: "Personal Guaranty", page: 3 },
      executionDate: "2026-07-02", achDate: "2026-07-02", notarizationRequired: true,
      notary: {
        ackDate: "2026-07-02",
        notaryName: { present: true, conf: 0.94 },
        commissionExpiration: { present: true, value: "2028-01-01", conf: 0.72 },
        commissionNumber: { present: true, conf: 0.9 },
        statutoryWording: { present: true, conf: 0.9 },
        witnessCount: 2, witnessConf: 0.9,
      },
    },
    audit: [
      { t: "08:15", actor: "System", type: "auto", event: "Review created \u00b7 jurisdiction Florida \u00b7 notarization required" },
      { t: "08:15", actor: "System", type: "auto", event: "5 documents uploaded and validated" },
      { t: "08:16", actor: "System", type: "auto", event: "Analysis complete \u00b7 low-confidence critical findings routed to review" },
    ],
  },
];

const OVERRIDE_REASONS = ["Extraction error", "Acceptable variation", "Wrong document classification", "Policy exception", "Evidence found elsewhere", "Other"];
const STAGES = ["Validating files", "Classifying documents", "Extracting fields", "Applying jurisdiction rules", "Building evidence-backed results"];

const statusStyle = (s) => ({
  Pass: { c: C.pass, bg: C.passBg, i: "\u2713" }, Fail: { c: C.fail, bg: C.failBg, i: "\u2715" },
  "Needs Review": { c: C.rev, bg: C.revBg, i: "\u26a0" }, "N/A": { c: C.na, bg: C.naBg, i: "\u2013" },
}[s]);
const recStyle = (rec) => ({
  "Ready for Confirmation": { c: C.pass, bg: C.passBg, i: "\u2713" }, "Exception Identified": { c: C.fail, bg: C.failBg, i: "\u2715" },
  "Needs Review": { c: C.rev, bg: C.revBg, i: "\u26a0" }, "Unable to Process": { c: C.na, bg: C.naBg, i: "\u2298" },
}[rec] || { c: C.na, bg: C.naBg, i: "\u2022" });

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

export default function App() {
  const [reviews, setReviews] = useState(seedReviews);
  const [stateParams, setStateParams] = useState(DEFAULT_STATE_PARAMS);
  const [screen, setScreen] = useState("dashboard");
  const [activeId, setActiveId] = useState(null);
  const [stage, setStage] = useState(0);
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [newForm, setNewForm] = useState({ caseId: "", name: "", stateId: "TX", notarizationRequired: false, files: [], ack: false });
  const timer = React.useRef(null);

  const active = reviews.find(x => x.reviewId === activeId);
  const getMergedRules = (rv) => {
    const base = buildRules(rv.pkg, stateParams[rv.stateId]);
    return base.map(r => {
      const ov = rv.overrides[r.id];
      return ov ? { ...r, status: ov.status, overridden: true, overrideReason: ov.reason, overrideNote: ov.note, origStatus: r.status } : { ...r, overridden: false };
    });
  };
  const recommendationFor = (rv) => computeRecommendation(getMergedRules(rv));

  React.useEffect(() => () => clearInterval(timer.current), []);
  const update = (id, fn) => setReviews(rs => rs.map(x => x.reviewId === id ? fn(structuredClone(x)) : x));
  const addAudit = (rv, actor, type, event) => { rv.audit.push({ t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor, type, event }); return rv; };
  const openReview = (id) => { setActiveId(id); setFilter("All"); setScreen("results"); };

  const startAnalysis = (targetId) => {
    setScreen("processing"); setStage(0);
    let s = 0;
    timer.current = setInterval(() => {
      s += 1;
      if (s >= STAGES.length) { clearInterval(timer.current); openReview(targetId); }
      else setStage(s);
    }, 650);
  };

  const createReview = () => {
    const id = "RV-" + (1042 + reviews.length);
    const caseId = newForm.caseId || "BL-" + (30000 + Math.floor(Math.random() * 9000));
    const docs = ["Business Loan Agreement", "Personal Guaranty", "ACH Authorization", "Business Borrower Certification", ...(newForm.notarizationRequired ? ["Notary Acknowledgment"] : [])];
    const pkg = {
      documents: docs,
      caseIds: Object.fromEntries(docs.map((d, i) => [i, caseId])),
      names: Object.fromEntries(docs.map((d, i) => [i, newForm.name || "Uploaded Demo Package LLC"])),
      signer: { present: true, conf: 0.95, doc: "Business Loan Agreement", page: 6 },
      guarantor: { present: true, conf: 0.94, doc: "Personal Guaranty", page: 3 },
      executionDate: "2026-07-09", achDate: "2026-07-09",
      notarizationRequired: newForm.notarizationRequired,
      notary: newForm.notarizationRequired ? {
        ackDate: "2026-07-09", notaryName: { present: true, conf: 0.95 },
        commissionExpiration: { present: true, value: "2029-01-01", conf: 0.95 },
        commissionNumber: { present: true, conf: 0.95 }, statutoryWording: { present: true, conf: 0.95 },
        witnessCount: stateParams[newForm.stateId].witnessMin, witnessConf: 0.95,
      } : null,
    };
    const rv = {
      reviewId: id, caseId, name: newForm.name || "Uploaded Demo Package", stateId: newForm.stateId,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), procSecs: 12,
      workflow: "In Review", disposition: null, overrides: {}, pkg,
      audit: [
        { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "System", type: "auto", event: `Review created \u00b7 jurisdiction ${STATE_LABELS[newForm.stateId]} \u00b7 notarization ${newForm.notarizationRequired ? "required" : "not required"}` },
        { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "System", type: "auto", event: "Phase 1 shell: package data seeded from form inputs; rules computed live from jurisdiction profile (live PDF extraction ships in a later phase)" },
      ],
    };
    setReviews(rs => [rv, ...rs]);
    setNewForm({ caseId: "", name: "", stateId: "TX", notarizationRequired: false, files: [], ack: false });
    startAnalysis(id);
  };

  const applyOverride = () => {
    const { rule } = modal;
    update(activeId, rv => {
      rv.overrides[rule.id] = { status: form.newStatus || "Pass", reason: form.reason, note: form.note || null };
      return addAudit(rv, "Demo Analyst", "human", `Override ${rule.id}: ${rule.status} \u2192 ${form.newStatus} \u00b7 reason: ${form.reason}${form.note ? " \u00b7 " + form.note : ""}`);
    });
    setModal(null); setForm({});
  };
  const applyReturn = () => {
    const merged = getMergedRules(active);
    const findings = merged.filter(x => x.status === "Fail" || x.status === "Needs Review");
    update(activeId, rv => {
      rv.workflow = "Returned"; rv.disposition = "Correction Required";
      return addAudit(rv, "Demo Analyst", "human", `Returned for correction \u00b7 findings: ${findings.map(x => x.id).join(", ")} \u00b7 structured summary generated`);
    });
    setModal(null);
  };
  const applyEscalate = () => {
    update(activeId, rv => {
      rv.workflow = "Escalated"; rv.disposition = "Escalated";
      return addAudit(rv, "Demo Analyst", "human", `Escalated \u00b7 category: ${form.cat || "Specialized review"} \u00b7 ${form.note || ""}`);
    });
    setModal(null); setForm({});
  };
  const applyConfirm = () => {
    update(activeId, rv => {
      rv.workflow = "Completed"; rv.disposition = "Ready for Funding";
      return addAudit(rv, "Demo Analyst", "human", "Recommendation confirmed \u00b7 final analyst disposition: Ready for Funding");
    });
    setModal(null);
  };

  const activeMergedRules = active ? getMergedRules(active) : [];
  const unresolvedCriticals = active ? activeMergedRules.filter(x => x.sev === "Critical" && (x.status === "Fail" || x.status === "Needs Review")) : [];

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${C.line}`, background: C.white, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setScreen("dashboard")}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: C.teal, color: "#fff", display: "grid", placeItems: "center", ...disp, fontWeight: 700 }}>AY</div>
        <div>
          <div style={{ ...disp, fontWeight: 700, fontSize: 15, color: C.ink }}>Assay</div>
          <div style={{ ...mono, fontSize: 10, color: C.sub }}>AI-enabled QC workstation \u00b7 prototype</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["dashboard", "Dashboard"], ["profiles", "Rule Profiles"], ["governance", "AI Governance"]].map(([s, label]) => (
          <button key={s} onClick={() => setScreen(s)} style={{ ...mono, fontSize: 11, padding: "6px 11px", borderRadius: 6, cursor: "pointer", border: `1px solid ${screen === s ? C.teal : C.line}`, background: screen === s ? C.tealSoft : C.white, color: screen === s ? C.teal : C.sub }}>{label}</button>
        ))}
      </div>
      <div style={{ ...mono, fontSize: 10, color: C.sub, textAlign: "right" }}>
        Synthetic data only \u00b7 independent portfolio prototype<br />Verifies documents post-notarization \u2014 not a notarization/RON platform
      </div>
    </div>
  );

  const Dashboard = () => {
    const total = reviews.length;
    const recs = reviews.map(recommendationFor);
    const ready = recs.filter(r => r === "Ready for Confirmation").length;
    const exc = recs.filter(r => r === "Exception Identified").length;
    const rev = recs.filter(r => r === "Needs Review").length;
    const overrides = reviews.reduce((a, x) => a + Object.keys(x.overrides).length, 0);
    const kpis = [["Packages processed", total], ["Ready rate", Math.round(ready / total * 100) + "%"], ["Exception rate", Math.round(exc / total * 100) + "%"], ["Needs-review queue", rev], ["Median handling time", "4.0 min"], ["Override count", overrides]];
    return (
      <div style={{ padding: 24, maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ ...disp, fontSize: 22, fontWeight: 700, margin: 0, color: C.ink }}>Operations dashboard</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.sub }}>Post-notarization document QC \u00b7 demo data</p>
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
          {reviews.map((x, i) => {
            const rs = recStyle(recs[i]);
            return (
              <div key={x.reviewId} onClick={() => openReview(x.reviewId)} style={{ display: "grid", gridTemplateColumns: "90px 110px 1fr 90px 190px 130px 110px", gap: 10, alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <span style={{ ...mono, fontSize: 12, color: C.sub }}>{x.reviewId}</span>
                <span style={{ ...mono, fontSize: 12, color: C.ink }}>{x.caseId}</span>
                <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{x.name}</span>
                <span style={{ ...mono, fontSize: 11, color: C.teal }}>{x.stateId}</span>
                <span style={{ ...disp, fontSize: 12, fontWeight: 600, color: rs.c }}>{rs.i} {recs[i]}</span>
                <span style={{ ...mono, fontSize: 11, color: C.sub }}>{x.workflow}</span>
                <span style={{ ...mono, fontSize: 11, color: x.disposition ? C.teal : C.na }}>{x.disposition || "—"}</span>
              </div>
            );
          })}
          <div style={{ padding: "8px 16px", ...mono, fontSize: 10, color: C.sub }}>columns: jurisdiction \u00b7 system recommendation \u00b7 workflow state \u00b7 analyst disposition</div>
        </div>
      </div>
    );
  };

  const NewReview = () => (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ ...disp, fontSize: 20, fontWeight: 700, color: C.ink }}>New package review</h1>
      <div style={{ background: C.revBg, border: `1px solid ${C.rev}44`, color: C.rev, borderRadius: 8, padding: "10px 14px", fontSize: 12, margin: "12px 0" }}>
        \u26a0 Synthetic documents only. This prototype must not receive real personal or financial information. Uploads are processed ephemerally and not persisted.
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Case ID
          <input value={newForm.caseId} onChange={e => setNewForm({ ...newForm, caseId: e.target.value })} placeholder="Auto-generated if left blank \u2014 e.g. BL-30499" style={{ ...mono, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13 }} />
          <span style={{ fontSize: 11, color: C.sub }}>In production this arrives from the loan-origination system; entering one manually is only for this demo.</span>
        </label>
        <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Package display name
          <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="Synthetic Business LLC" style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13 }} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Jurisdiction (state) *
            <select value={newForm.stateId} onChange={e => setNewForm({ ...newForm, stateId: e.target.value })} style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, background: C.white }}>
              {Object.entries(STATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.ink, marginTop: 20 }}>
            <input type="checkbox" checked={newForm.notarizationRequired} onChange={e => setNewForm({ ...newForm, notarizationRequired: e.target.checked })} />
            Package includes notarized execution
          </label>
        </div>
        <div onClick={() => setNewForm({ ...newForm, files: ["Business Loan Agreement.pdf", "Personal Guaranty.pdf", "ACH Authorization.pdf", "Borrower Certification.pdf", ...(newForm.notarizationRequired ? ["Notary Acknowledgment.pdf"] : [])] })}
          style={{ border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: 22, textAlign: "center", cursor: "pointer", color: C.sub, fontSize: 13 }}>
          {newForm.files.length ? newForm.files.map(f => <div key={f} style={{ ...mono, fontSize: 12, color: C.ink }}>{f}</div>) : <>Drag & drop up to 5 PDFs (\u226425 pages) \u2014 click to simulate an upload<br /><span style={{ fontSize: 11 }}>Supported: Loan Agreement, Guaranty, ACH Authorization, Certification, Notary Ack</span></>}
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
            const rs = recStyle(recommendationFor(x));
            return (
              <div key={x.reviewId} onClick={() => startAnalysis(x.reviewId)} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 14px", display: "flex", justifyContent: "space-between", cursor: "pointer", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{x.name} <span style={{ ...mono, fontSize: 11, color: C.sub }}>\u00b7 {x.caseId} \u00b7 {STATE_LABELS[x.stateId]}{x.pkg.notarizationRequired ? " \u00b7 notarized" : ""}</span></span>
                <span style={{ ...disp, fontSize: 12, fontWeight: 600, color: rs.c }}>{rs.i} {recommendationFor(x)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const Processing = () => (
    <div style={{ padding: 60, maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ ...disp, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Analyzing package</h1>
      <p style={{ fontSize: 12, color: C.sub, marginBottom: 20 }}>Automated checks only \u2014 an analyst makes the final disposition. This is not legal validation.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, background: i < stage ? C.passBg : i === stage ? C.tealSoft : C.naBg, color: i < stage ? C.pass : i === stage ? C.teal : C.na, border: `1px solid ${i <= stage ? (i < stage ? C.pass : C.teal) : C.line}` }}>{i < stage ? "\u2713" : i + 1}</span>
            <span style={{ fontSize: 13, color: i <= stage ? C.ink : C.sub, fontWeight: i === stage ? 600 : 400 }}>{s}{i === stage && "\u2026"}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const Results = () => {
    if (!active) return null;
    const merged = activeMergedRules;
    const rs = recStyle(computeRecommendation(merged));
    const order = { Fail: 0, "Needs Review": 1, Pass: 2, "N/A": 3 };
    const shown = merged.filter(x => filter === "All" ? true : x.status === filter).sort((a, b) => order[a.status] - order[b.status]);
    const counts = ["Fail", "Needs Review", "Pass", "N/A"].map(s => [s, merged.filter(x => x.status === s).length]);
    return (
      <div style={{ padding: 24, maxWidth: 1080, margin: "0 auto" }}>
        <button onClick={() => setScreen("dashboard")} style={{ ...mono, fontSize: 11, background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 0, marginBottom: 10 }}>\u2190 dashboard</button>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{ ...disp, fontSize: 19, fontWeight: 700, margin: 0, color: C.ink }}>{active.name}</h1>
              <div style={{ ...mono, fontSize: 11, color: C.sub, marginTop: 4 }}>
                {active.reviewId} \u00b7 {active.caseId} \u00b7 {STATE_LABELS[active.stateId]} profile \u00b7 rules v1.0 \u00b7 processed in {active.procSecs}s
              </div>
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              <Chip label="System recommendation" value={computeRecommendation(merged)} style={rs} />
              <Chip label="Workflow state" value={active.workflow} style={{ c: C.auto, bg: C.autoBg, i: "\u25f7" }} />
              <Chip label="Final analyst disposition" value={active.disposition || "Pending"} style={active.disposition ? { c: C.teal, bg: C.tealSoft, i: "\u270d" } : { c: C.na, bg: C.naBg, i: "\u2026" }} />
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
                <div style={{ marginTop: 8, fontSize: 12.5, color: C.ink }}><span style={{ color: C.sub }}>Evidence: </span>{x.evidence}</div>
                <div style={{ ...mono, fontSize: 11, color: C.sub, marginTop: 4 }}>
                  {x.doc}{x.page ? ` \u00b7 page ${x.page}` : ""} \u00b7 extracted: {x.value}
                  {x.overridden && <span style={{ color: C.auto }}> \u00b7 overridden by analyst ({x.overrideReason}) \u2014 system finding: {x.origStatus}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Audit = () => (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <button onClick={() => setScreen("results")} style={{ ...mono, fontSize: 11, background: "none", border: "none", color: C.sub, cursor: "pointer", padding: 0, marginBottom: 10 }}>\u2190 results</button>
      <h1 style={{ ...disp, fontSize: 19, fontWeight: 700, color: C.ink }}>Audit history \u2014 {active?.reviewId}</h1>
      <p style={{ fontSize: 12, color: C.sub }}>Every automated and human event, chronologically. Nothing is silently replaced.</p>
      <div style={{ display: "grid", gap: 0, marginTop: 12 }}>
        {active?.audit.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ ...mono, fontSize: 11, color: C.sub, width: 44 }}>{e.t}</span>
            <span style={{ ...disp, fontSize: 11, fontWeight: 600, color: e.type === "auto" ? C.auto : C.teal, background: e.type === "auto" ? C.autoBg : C.tealSoft, padding: "2px 8px", borderRadius: 5, height: "fit-content" }}>{e.type === "auto" ? "AUTOMATED" : "HUMAN"}</span>
            <span style={{ fontSize: 12.5, color: C.ink }}>{e.event} <span style={{ ...mono, fontSize: 10, color: C.sub }}>\u00b7 {e.actor}</span></span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}><Btn small kind="ghost" onClick={() => alert(JSON.stringify(active.audit, null, 2))}>Export JSON</Btn></div>
    </div>
  );

  const RuleProfiles = () => {
    const setParam = (state, key, val) => setStateParams(p => ({ ...p, [state]: { ...p[state], [key]: val } }));
    return (
      <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ ...disp, fontSize: 20, fontWeight: 700, color: C.ink }}>Rule Profile Manager</h1>
        <p style={{ fontSize: 13, color: C.sub, maxWidth: 620 }}>
          Jurisdiction rules are data, not code. Editing a parameter here recomputes findings live across every review using that state \u2014 try lowering Florida's witness minimum and reopening the Marisol review.
        </p>
        <div style={{ background: C.revBg, border: `1px solid ${C.rev}44`, color: C.rev, borderRadius: 8, padding: "9px 13px", fontSize: 11.5, margin: "10px 0 18px" }}>
          These are illustrative, fictional demo requirements \u2014 not real state notary law. Any resemblance to actual statutory requirements is coincidental; do not use for compliance decisions.
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {Object.entries(STATE_LABELS).map(([code, label]) => (
            <div key={code} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ ...disp, fontWeight: 700, fontSize: 15, color: C.ink }}>{label} <span style={{ ...mono, fontSize: 11, color: C.sub }}>({code})</span></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub }}>Witness minimum (WIT-001)
                  <input type="number" min={0} max={5} value={stateParams[code].witnessMin} onChange={e => setParam(code, "witnessMin", Math.max(0, parseInt(e.target.value) || 0))} style={{ ...mono, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, width: 90 }} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink }}>
                  <input type="checkbox" checked={stateParams[code].requireCommissionNumber} onChange={e => setParam(code, "requireCommissionNumber", e.target.checked)} />
                  Require commission number (NOT-001)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink }}>
                  <input type="checkbox" checked={stateParams[code].requireStatutoryWording} onChange={e => setParam(code, "requireStatutoryWording", e.target.checked)} />
                  Require statutory wording (NOT-001)
                </label>
              </div>
              <div style={{ ...mono, fontSize: 10.5, color: C.sub, marginTop: 10 }}>Always required when notarization applies: acknowledgment date, notary name, commission expiration (NOT-001/NOT-002).</div>
            </div>
          ))}
        </div>
        <Btn kind="ghost" small onClick={() => setStateParams(DEFAULT_STATE_PARAMS)}>Reset all to defaults</Btn>
      </div>
    );
  };

  const Governance = () => {
    const allMerged = reviews.map(rv => ({ rv, rules: getMergedRules(rv) }));
    const byRule = RULE_ORDER.map(id => {
      const instances = allMerged.flatMap(({ rv, rules }) => rules.filter(r => r.id === id && r.status !== "N/A").map(r => ({ rv, r })));
      const overridden = instances.filter(x => x.r.overridden);
      const rate = instances.length ? overridden.length / instances.length : 0;
      return { id, name: RULES_META[id].name, sev: RULES_META[id].sev, evaluated: instances.length, overrides: overridden.length, rate };
    });
    const totalEval = byRule.reduce((a, x) => a + x.evaluated, 0);
    const totalOv = byRule.reduce((a, x) => a + x.overrides, 0);
    const flagged = byRule.filter(x => x.rate > 0.15 && x.evaluated > 0);
    return (
      <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ ...disp, fontSize: 20, fontWeight: 700, color: C.ink }}>AI Governance</h1>
        <p style={{ fontSize: 13, color: C.sub, maxWidth: 680 }}>
          Fannie Mae Lender Letter LL-2026-04 (effective August 6, 2026) requires mortgage AI/ML systems to be monitored for performance degradation and drift, with a traceable path from source document through validation to final disposition. This panel is a lightweight illustration of that monitoring pattern \u2014 a real deployment would pair it with labeled accuracy testing over a much larger sample, not override rate alone.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, margin: "16px 0" }}>
          {[["Rule evaluations (active)", totalEval], ["Total overrides", totalOv], ["Overall override rate", totalEval ? Math.round(totalOv / totalEval * 100) + "%" : "0%"], ["Rules flagged (>15%)", flagged.length]].map(([k, v]) => (
            <div key={k} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: C.sub }}>{k}</div>
              <div style={{ ...disp, fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.line}`, ...disp, fontWeight: 600, fontSize: 13 }}>Override rate by rule</div>
          {byRule.map(x => (
            <div key={x.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px 90px 90px 110px", gap: 10, alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ ...mono, fontSize: 11, color: C.sub }}>{x.id}</span>
              <span style={{ fontSize: 12.5, color: C.ink }}>{x.name}</span>
              <span style={{ ...mono, fontSize: 10, color: x.sev === "Critical" ? C.fail : C.rev }}>{x.sev}</span>
              <span style={{ ...mono, fontSize: 11, color: C.sub }}>{x.evaluated} eval</span>
              <span style={{ ...mono, fontSize: 11, color: C.sub }}>{x.overrides} overrides</span>
              <span style={{ ...disp, fontSize: 12, fontWeight: 600, color: x.rate > 0.15 ? C.fail : C.pass, background: x.rate > 0.15 ? C.failBg : C.passBg, padding: "3px 9px", borderRadius: 5, width: "fit-content" }}>
                {x.evaluated ? Math.round(x.rate * 100) : 0}% {x.rate > 0.15 && x.evaluated > 0 ? "\u26a0 flagged" : ""}
              </span>
            </div>
          ))}
        </div>
        <div style={{ ...mono, fontSize: 10.5, color: C.sub, marginTop: 10 }}>
          Confidence is treated as a routing signal, not a calibrated probability of correctness \u2014 per rule thresholds set in Rule Profiles. Full per-finding traceability (source document \u2192 extracted field \u2192 rule result \u2192 human action) is available in each review's Audit history.
        </div>
      </div>
    );
  };

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
            <h2 style={{ ...disp, fontSize: 16, fontWeight: 700, margin: 0 }}>Override {x.id} \u2014 {x.name}</h2>
            <div style={{ ...mono, fontSize: 11, color: C.sub, margin: "8px 0 14px" }}>System finding: {x.status} \u00b7 conf {x.conf?.toFixed(2)} \u00b7 the original finding is preserved in history.</div>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, marginBottom: 10 }}>New result
              <select value={form.newStatus} onChange={e => setForm({ ...form, newStatus: e.target.value })} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7 }}>
                {["Pass", "Fail", "Needs Review"].filter(s => s !== x.status).map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 12, color: C.sub, marginBottom: 10 }}>Reason (required)
              <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ padding: 8, border: `1px solid ${C.line}`, borderRadius: 7 }}>
                <option value="">Select a reason\u2026</option>
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
      const findings = activeMergedRules.filter(x => x.status === "Fail" || x.status === "Needs Review");
      return (
        <div style={wrap} onClick={() => setModal(null)}>
          <div style={box} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...disp, fontSize: 16, fontWeight: 700, margin: 0 }}>Return for correction</h2>
            <p style={{ fontSize: 12, color: C.sub }}>Structured correction summary \u2014 failed and needs-review findings are pre-selected:</p>
            {findings.map(x => (
              <div key={x.id} style={{ fontSize: 12, padding: "7px 10px", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 7, marginBottom: 6 }}>
                <span style={{ ...mono }}>{x.id}</span> \u00b7 {x.doc}{x.page ? ` p.${x.page}` : ""} \u2014 {x.evidence}
              </div>
            ))}
            {findings.length === 0 && <div style={{ fontSize: 12, color: C.sub }}>No open findings \u2014 nothing to return.</div>}
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
                <option value="">Select\u2026</option>
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
                  \u2715 A "Ready for Funding" disposition is blocked: {unresolvedCriticals.length} unresolved critical finding(s) \u2014 {unresolvedCriticals.map(x => x.id).join(", ")}. Resolve via override (with reason), return for correction, or escalate.
                </div>
                <Btn kind="ghost" onClick={() => setModal(null)}>Back</Btn>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: C.ink }}>Final analyst disposition will be recorded as <b>Ready for Funding</b> \u2014 a human decision, distinct from the system recommendation. This action is logged with your identity and timestamp.</p>
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
      {screen === "profiles" && RuleProfiles()}
      {screen === "governance" && Governance()}
      {Modal()}
      <div style={{ textAlign: "center", padding: "18px 0 26px", ...mono, fontSize: 10, color: C.sub }}>
        Assay \u00b7 configurable jurisdiction rules engine \u00b7 deterministic demo package data \u00b7 not legal or compliance advice
      </div>
    </div>
  );
}

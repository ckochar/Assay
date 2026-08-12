import React from "react";

const C = {
  panel: "#ffffff",
  ink: "#14211d",
  sub: "#60706a",
  line: "#dfe6e2",
  teal: "#0d6259",
  tealSoft: "#e4f0ee",
  blue: "#215f87",
  blueSoft: "#e8f1f7",
  review: "#93620a",
  reviewSoft: "#f8efd9",
  muted: "#eef2f0",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

function Action({ children, onClick, href, secondary = false }) {
  const style = {
    ...display,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 8,
    padding: "10px 15px",
    fontSize: 12,
    fontWeight: 780,
    cursor: "pointer",
    background: secondary ? C.panel : C.teal,
    color: secondary ? C.ink : "white",
    border: secondary ? `1px solid ${C.line}` : "1px solid transparent",
  };
  if (href) return <a href={href} style={style}>{children}</a>;
  return <button type="button" onClick={onClick} style={style}>{children}</button>;
}

function ProofPoint({ children }) {
  return <span style={{ ...mono, color: C.sub, background: C.muted, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 9px", fontSize: 9.5, fontWeight: 750 }}>{children}</span>;
}

function ValueStrip() {
  const metrics = [
    ["10–15 min", "Manual QC baseline"],
    ["1–2 min", "Assisted review target"],
    ["80%+", "Potential review-time reduction"],
  ];

  return <div style={{ marginTop: 18, background: C.muted, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 9 }}>
      <div style={{ ...mono, color: C.sub, fontSize: 9, fontWeight: 800 }}>ILLUSTRATIVE OPERATING TARGET · 30–40 PAGE PACKAGE</div>
      <div style={{ color: C.sub, fontSize: 9.5 }}>Prototype assumptions, not measured production benchmarks.</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(150px,1fr))", gap: 8 }}>
      {metrics.map(([value, label]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ color: C.teal, fontSize: 20, lineHeight: 1, fontWeight: 850 }}>{value}</div>
        <div style={{ ...mono, color: C.sub, fontSize: 9.5, marginTop: 6 }}>{label.toUpperCase()}</div>
      </div>)}
    </div>
  </div>;
}

function WhyAssay() {
  const capabilities = [
    ["Understand", "Classify documents, extract structured information, and preserve page-linked source evidence."],
    ["Evaluate", "Apply versioned QC controls to the extracted evidence instead of treating AI output as the final decision."],
    ["Focus", "Route exceptions and uncertain evidence to a human reviewer so attention goes where judgment is needed."],
    ["Record", "Preserve analyst actions, corrections, overrides, and the final disposition in an auditable history."],
  ];

  return <section style={{ marginTop: 24, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
    <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ ...mono, color: C.sub, fontSize: 9 }}>WHY ASSAY</div>
      <h2 style={{ ...display, margin: "4px 0 0", fontSize: 19 }}>Reduce manual document hunting without hiding the evidence.</h2>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,.9fr) minmax(430px,1.4fr)", gap: 0 }}>
      <div style={{ padding: 18, background: C.muted, borderRight: `1px solid ${C.line}` }}>
        <div style={{ ...mono, color: C.review, fontSize: 9, fontWeight: 800 }}>THE PROBLEM</div>
        <p style={{ color: C.ink, fontSize: 13, lineHeight: 1.55, margin: "8px 0 8px" }}>Post-execution mortgage QC often requires analysts to move page by page through executed documents to determine whether the package is complete, correctly executed, and ready to move forward.</p>
        <p style={{ color: C.sub, fontSize: 11, lineHeight: 1.55, margin: 0 }}>The work is repetitive, but missed exceptions can create rework, funding delays, and control risk.</p>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ ...mono, color: C.teal, fontSize: 9, fontWeight: 800 }}>WHAT ASSAY DOES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(180px,1fr))", gap: 9, marginTop: 9 }}>
          {capabilities.map(([title, body]) => <div key={title} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 12 }}><div style={{ color: C.teal, fontWeight: 800, fontSize: 11.5 }}>{title}</div><div style={{ color: C.sub, fontSize: 10.4, lineHeight: 1.5, marginTop: 4 }}>{body}</div></div>)}
        </div>
      </div>
    </div>
  </section>;
}

function WorkflowSteps() {
  const steps = [
    ["1", "Intake", "Receive executed documents."],
    ["2", "Understand", "Classify and extract evidence."],
    ["3", "Apply Rules", "Evaluate QC controls."],
    ["4", "Review", "Inspect exceptions and uncertainty."],
    ["5", "Dispose", "Confirm, correct, or override."],
  ];

  return <section style={{ marginTop: 24 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>WORKFLOW</div>
    <h2 style={{ ...display, margin: "4px 0 4px", fontSize: 19 }}>How Assay works</h2>
    <p style={{ color: C.sub, fontSize: 11.5, margin: "0 0 11px" }}>A simple operating loop from executed documents to a human-accountable QC disposition.</p>
    <div style={{ display: "flex", gap: 6, alignItems: "stretch", overflowX: "auto" }}>
      {steps.map(([n, title, body], index) => <React.Fragment key={n}>
        <div style={{ minWidth: 150, flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}>
          <span style={{ ...mono, display: "inline-flex", color: C.teal, background: C.tealSoft, borderRadius: 6, padding: "4px 7px", fontSize: 10, fontWeight: 800 }}>{n}</span>
          <div style={{ fontWeight: 800, marginTop: 7, fontSize: 11.5 }}>{title}</div>
          <div style={{ color: C.sub, fontSize: 10, lineHeight: 1.45, marginTop: 3 }}>{body}</div>
        </div>
        {index < steps.length - 1 && <div aria-hidden="true" style={{ alignSelf: "center", color: "#9aa7a1", fontSize: 18, flex: "0 0 auto" }}>→</div>}
      </React.Fragment>)}
    </div>
  </section>;
}

function AboutPrototype() {
  return <section style={{ marginTop: 24, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>ABOUT THIS PROTOTYPE</div>
    <h2 style={{ ...display, margin: "4px 0 4px", fontSize: 18 }}>What you can use today</h2>
    <p style={{ color: C.sub, fontSize: 10.8, margin: "0 0 12px" }}>The product demonstrates the workflow from package understanding through evidence-backed QC review while keeping legal, policy, and production boundaries explicit.</p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(210px,1fr))", gap: 9 }}>
      <div style={{ background: C.muted, border: `1px solid ${C.line}`, borderRadius: 9, padding: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ fontSize: 11.5 }}>Demo Workspace</b><span style={{ ...mono, color: C.teal, background: C.tealSoft, borderRadius: 6, padding: "4px 7px", fontSize: 9, fontWeight: 800 }}>AVAILABLE</span></div>
        <p style={{ color: C.sub, fontSize: 10.3, lineHeight: 1.5, margin: "7px 0 0" }}>Preloaded mortgage packages demonstrate evidence-backed findings, human review, correction, overrides, final disposition, and audit history.</p>
      </div>
      <div style={{ background: C.blueSoft, border: `1px solid ${C.blue}33`, borderRadius: 9, padding: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ fontSize: 11.5 }}>Package Intelligence</b><span style={{ ...mono, color: C.blue, background: C.panel, borderRadius: 6, padding: "4px 7px", fontSize: 9, fontWeight: 800 }}>BETA</span></div>
        <p style={{ color: C.sub, fontSize: 10.3, lineHeight: 1.5, margin: "7px 0 0" }}>Analyze up to eight pages with Azure, classify and segment documents, resolve package context, generate package and document-specific QC controls, and hand the result into the same reviewer workspace.</p>
      </div>
      <div style={{ background: C.muted, border: `1px solid ${C.line}`, borderRadius: 9, padding: 13 }}>
        <div style={{ fontWeight: 800, fontSize: 11.5 }}>Technology</div>
        <p style={{ color: C.sub, fontSize: 10.3, lineHeight: 1.55, margin: "7px 0 0" }}>React + Vite · Azure Document Intelligence · PDF.js · Vercel Functions · Node.js · build-gated automated tests.</p>
      </div>
    </div>

    <details style={{ marginTop: 10, background: C.muted, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px" }}>
      <summary style={{ cursor: "pointer", fontSize: 10.8, fontWeight: 800 }}>View technical details and current scope</summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(260px,1fr))", gap: 12, marginTop: 10, color: C.sub, fontSize: 10.3, lineHeight: 1.55 }}>
        <div><b style={{ color: C.ink }}>Live scope</b><br />Package Intelligence analyzes up to eight pages, creates a document inventory, extracts loan and jurisdiction context, pins a candidate profile, and generates evidence-backed controls for package identity, Note dates and signature indicators, Right-to-Cancel content and dates, notary fields and chronology, and cross-document borrower/date consistency. The earlier two-page Promissory Note analyzer remains available separately.</div>
        <div><b style={{ color: C.ink }}>Decision model</b><br />Azure performs document OCR/layout analysis. Assay normalizes extracted evidence and applies deterministic QC logic. Unknown or low-confidence evidence routes to review, while signature execution, notary execution, rescission applicability, and legal sufficiency remain human decisions rather than model claims.</div>
      </div>
    </details>
  </section>;
}

export default function OverviewScreen({ onNavigate }) {
  return <main style={{ ...display, maxWidth: 1120, margin: "0 auto", padding: "30px 24px 28px", color: C.ink }}>
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "29px 30px 25px" }}>
      <div style={{ ...mono, color: C.teal, fontSize: 10, fontWeight: 800 }}>AI-ASSISTED POST-EXECUTION MORTGAGE QC</div>
      <h1 style={{ fontSize: 32, lineHeight: 1.12, margin: "10px 0 11px", maxWidth: 790 }}>From executed mortgage documents to evidence-backed QC decisions.</h1>
      <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, maxWidth: 820, margin: 0 }}>Assay combines document AI, deterministic QC rules, source-linked evidence, and human review to help mortgage operations teams identify exceptions and record auditable dispositions.</p>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 19 }}><Action onClick={() => onNavigate("dashboard")}>Explore sample cases</Action><Action href="/package" secondary>Analyze a package</Action></div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}><ProofPoint>Evidence-backed findings</ProofPoint><ProofPoint>Human review for uncertainty</ProofPoint><ProofPoint>Auditable decisions</ProofPoint></div>
      <ValueStrip />
    </section>

    <WhyAssay />
    <WorkflowSteps />
    <AboutPrototype />
  </main>;
}

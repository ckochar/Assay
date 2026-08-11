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

function WorkflowSteps() {
  const steps = [
    ["1", "Intake", "Receive an executed package through RON, Mobile Notary, QC Only, or upload."],
    ["2", "Understand", "OCR and AI classify documents, extract structured fields, and preserve source evidence."],
    ["3", "Apply Rules", "Resolve the applicable rule profile and evaluate deterministic QC controls."],
    ["4", "Review", "Route exceptions and uncertain evidence to a human with the source evidence attached."],
    ["5", "Dispose", "Confirm, override, return for correction, or record an authorized exception with audit history."],
  ];

  return <section style={{ marginTop: 28 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>WORKFLOW</div>
    <h2 style={{ ...display, margin: "4px 0 4px", fontSize: 19 }}>How Assay works</h2>
    <p style={{ color: C.sub, fontSize: 12, margin: "0 0 12px" }}>The operating loop from an executed document package to a human-accountable QC disposition.</p>
    <div style={{ display: "flex", gap: 6, alignItems: "stretch", overflowX: "auto" }}>
      {steps.map(([n, title, body], index) => <React.Fragment key={n}>
        <div style={{ minWidth: 165, flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 13 }}>
          <span style={{ ...mono, display: "inline-flex", color: C.teal, background: C.tealSoft, borderRadius: 6, padding: "4px 7px", fontSize: 10, fontWeight: 800 }}>{n}</span>
          <div style={{ fontWeight: 800, marginTop: 8, fontSize: 12 }}>{title}</div>
          <div style={{ color: C.sub, fontSize: 10.5, lineHeight: 1.5, marginTop: 4 }}>{body}</div>
        </div>
        {index < steps.length - 1 && <div aria-hidden="true" style={{ alignSelf: "center", color: "#9aa7a1", fontSize: 19, flex: "0 0 auto" }}>→</div>}
      </React.Fragment>)}
    </div>
  </section>;
}

function ArchitectureFlow() {
  const stages = [
    ["Executed package", "RON · Mobile Notary · QC Only · upload", "current"],
    ["Document understanding", "OCR · classification · extraction · evidence", "current"],
    ["Rule resolution", "Jurisdiction · transaction · investor/client overlays", "next"],
    ["QC evaluation", "Versioned deterministic controls", "current"],
    ["Human review", "Exceptions · uncertainty · overrides", "current"],
    ["Disposition + audit", "Ready · correction · exception · trace", "current"],
  ];

  return <section style={{ marginTop: 28, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 17 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, flexWrap: "wrap" }}>
      <div><div style={{ ...mono, color: C.sub, fontSize: 9 }}>PRODUCT ARCHITECTURE</div><h2 style={{ ...display, margin: "4px 0", fontSize: 18 }}>From package to decision</h2><p style={{ color: C.sub, fontSize: 11.5, margin: 0 }}>AI understands the documents and evidence; versioned controls own QC decisions wherever deterministic evaluation is possible.</p></div>
      <span style={{ ...mono, color: C.review, background: C.reviewSoft, borderRadius: 6, padding: "5px 8px", fontSize: 9.5, fontWeight: 800 }}>RULE RESOLUTION EXPANDS NEXT</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 8, marginTop: 14 }}>
      {stages.map(([title, body, state], index) => <div key={title} style={{ background: state === "next" ? C.reviewSoft : C.muted, border: `1px solid ${state === "next" ? `${C.review}44` : C.line}`, borderRadius: 9, padding: 12, position: "relative" }}>
        <div style={{ ...mono, color: state === "next" ? C.review : C.sub, fontSize: 9 }}>{String(index + 1).padStart(2, "0")}{state === "next" ? " · NEXT" : ""}</div>
        <div style={{ fontWeight: 800, fontSize: 11.5, marginTop: 5 }}>{title}</div>
        <div style={{ color: C.sub, fontSize: 10, lineHeight: 1.45, marginTop: 4 }}>{body}</div>
      </div>)}
    </div>
  </section>;
}

function CapabilityCards({ onNavigate }) {
  const cards = [
    ["QC Workspace", "Review sample and live-analyzed cases, inspect evidence, resolve findings, and record final dispositions.", "Open QC Dashboard", "dashboard"],
    ["Rule Profiles", "See how QC controls and policy parameters are versioned and associated with evaluation context.", "View Rule Profiles", "profiles"],
    ["AI Governance", "Inspect confidence routing, human-review safeguards, overrides, and the zero-false-ready release gate.", "View AI Governance", "governance"],
  ];
  return <section style={{ marginTop: 28 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>EXPLORE</div>
    <h2 style={{ ...display, margin: "4px 0 12px", fontSize: 18 }}>What you can explore</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
      {cards.map(([title, body, action, screen]) => <button type="button" key={title} onClick={() => onNavigate(screen)} style={{ ...display, textAlign: "left", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 15, cursor: "pointer", color: C.ink }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
        <div style={{ color: C.sub, fontSize: 10.8, lineHeight: 1.5, marginTop: 5, minHeight: 48 }}>{body}</div>
        <div style={{ color: C.teal, fontSize: 10.5, fontWeight: 800, marginTop: 10 }}>{action} →</div>
      </button>)}
    </div>
  </section>;
}

function PrototypeScope() {
  const rows = [
    ["Demo Workspace", "Preloaded mortgage-package scenarios demonstrating the full analyst review and disposition lifecycle.", "Available", C.teal, C.tealSoft],
    ["Live Analysis", "Azure Document Intelligence analyzes a sample Promissory Note, currently scoped to pages 1–2, then creates the same QC case used by the review workspace.", "Available", C.blue, C.blueSoft],
    ["True Package Intelligence", "Multi-document package splitting/classification plus automatic context and rule-profile resolution across the package.", "Next", C.review, C.reviewSoft],
  ];
  return <section style={{ marginTop: 28, background: C.muted, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
    <div style={{ ...mono, color: C.sub, fontSize: 9 }}>PROTOTYPE SCOPE</div>
    <h2 style={{ ...display, margin: "4px 0 5px", fontSize: 17 }}>What is live today</h2>
    <p style={{ color: C.sub, fontSize: 10.8, margin: "0 0 10px" }}>Assay separates demonstrated capabilities from the next implementation layer.</p>
    <div style={{ display: "grid", gap: 7 }}>
      {rows.map(([title, body, status, color, bg]) => <div key={title} style={{ display: "grid", gridTemplateColumns: "minmax(145px,.7fr) minmax(300px,2fr) auto", gap: 12, alignItems: "center", background: "#ffffffaa", border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
        <b style={{ fontSize: 11.5 }}>{title}</b><span style={{ color: C.sub, fontSize: 10.3, lineHeight: 1.45 }}>{body}</span><span style={{ ...mono, color, background: bg, borderRadius: 6, padding: "4px 7px", fontSize: 9.5, fontWeight: 800 }}>{status}</span>
      </div>)}
    </div>
  </section>;
}

export default function OverviewScreen({ onNavigate }) {
  return <main style={{ ...display, maxWidth: 1180, margin: "0 auto", padding: "34px 24px 28px", color: C.ink }}>
    <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(280px,.65fr)", gap: 18, alignItems: "stretch" }}>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "28px 28px 25px" }}>
        <div style={{ ...mono, color: C.teal, fontSize: 10, fontWeight: 800 }}>AI-ASSISTED POST-EXECUTION MORTGAGE QC</div>
        <h1 style={{ fontSize: 32, lineHeight: 1.12, margin: "10px 0 12px", maxWidth: 760 }}>From executed documents to evidence-backed QC disposition.</h1>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, maxWidth: 760, margin: 0 }}>Assay helps mortgage operations teams understand executed documents, evaluate QC controls against source evidence, focus human attention on true exceptions or uncertainty, and preserve the reasoning behind the final disposition.</p>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 20 }}><Action onClick={() => onNavigate("dashboard")}>Explore sample cases</Action><Action href="/live" secondary>Analyze a document live</Action></div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {[
          ["Document understanding", "OCR + AI organize document content into structured fields and page-linked evidence."],
          ["Evidence-first QC", "Each finding shows what Assay evaluated and where the supporting source evidence came from."],
          ["Human accountability", "Uncertain or high-risk findings stay reviewable; overrides and final dispositions remain auditable."],
        ].map(([title, body]) => <div key={title} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}><div style={{ color: C.teal, fontWeight: 800, fontSize: 11.5 }}>{title}</div><div style={{ color: C.sub, fontSize: 10.5, lineHeight: 1.5, marginTop: 4 }}>{body}</div></div>)}
      </div>
    </section>

    <WorkflowSteps />
    <ArchitectureFlow />
    <CapabilityCards onNavigate={onNavigate} />
    <PrototypeScope />
  </main>;
}

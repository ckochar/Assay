import React from "react";
import { GOLDEN_EVALUATION_CASES } from "./data/goldenEvaluationCases.js";
import { evaluateGoldenCases } from "./domain/goldenEvaluation.js";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", blue: "#215f87", blueSoft: "#e8f1f7",
  review: "#93620a", reviewSoft: "#f8efd9", fail: "#ad312b", failSoft: "#fae9e7",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const display = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function toneFor(value) {
  if (value === "Ready for Review") return { color: C.teal, background: C.tealSoft };
  if (value === "Exception Identified") return { color: C.fail, background: C.failSoft };
  return { color: C.review, background: C.reviewSoft };
}

function Pill({ children, tone }) {
  return <span style={{ ...mono, ...tone, display: "inline-flex", borderRadius: 999, padding: "4px 7px", fontSize: 9.5, fontWeight: 800 }}>{children}</span>;
}

export default function EvaluationScreen() {
  const evaluation = evaluateGoldenCases(GOLDEN_EVALUATION_CASES);
  const { metrics, rows } = evaluation;
  const cards = [
    [metrics.totalCases, "Labeled cases"],
    [pct(metrics.recommendationAccuracy), "Recommendation accuracy"],
    [metrics.falseReady, "False-ready packages"],
    [metrics.falseException, "False exceptions"],
    [metrics.missedException, "Missed exceptions"],
    [pct(metrics.automationRate), "Ready recommendation rate"],
  ];

  return <main style={{ ...display, minHeight: "100vh", background: C.bg, color: C.ink }}>
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 38px" }}>
      <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 22 }}>
        <div style={{ ...mono, color: C.blue, fontSize: 9.5, fontWeight: 800 }}>RELIABILITY EVALUATION · DECISION LAYER</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap", marginTop: 6 }}>
          <div style={{ maxWidth: 760 }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>Can Assay avoid unsafe ready recommendations?</h1>
            <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.6, margin: "8px 0 0" }}>This labeled synthetic golden set tests Assay’s deterministic package and document-specific decision logic across clean, human-review, and contradiction scenarios. The primary release gate is zero false-ready packages.</p>
          </div>
          <div style={{ background: metrics.releaseGatePassed ? C.tealSoft : C.failSoft, color: metrics.releaseGatePassed ? C.teal : C.fail, borderRadius: 10, padding: "11px 13px", minWidth: 190 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>RELEASE GATE</div>
            <div style={{ fontSize: 16, fontWeight: 850, marginTop: 4 }}>{metrics.releaseGatePassed ? "PASS · 0 false-ready" : "FAIL · investigate"}</div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 9, marginTop: 14 }}>
        {cards.map(([value, label]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 23, fontWeight: 850, color: label === "False-ready packages" && value === 0 ? C.teal : C.ink }}>{value}</div>
          <div style={{ ...mono, color: C.sub, fontSize: 9.5, marginTop: 5 }}>{label.toUpperCase()}</div>
        </div>)}
      </section>

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 14, alignItems: "start" }}>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
          <div style={{ padding: "14px 15px", borderBottom: `1px solid ${C.line}` }}>
            <b>Labeled golden cases</b>
            <div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>Expected labels are defined independently from the recommendation computed by the Assay rule engine.</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 860 }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px minmax(220px,1fr) 145px 145px 80px", gap: 10, padding: "9px 14px", background: "#eef2f0", ...mono, color: C.sub, fontSize: 9 }}>
                <span>CASE</span><span>SCENARIO</span><span>EXPECTED</span><span>ASSAY</span><span>RESULT</span>
              </div>
              {rows.map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "80px minmax(220px,1fr) 145px 145px 80px", gap: 10, padding: "12px 14px", borderTop: `1px solid ${C.line}`, alignItems: "start", fontSize: 11 }}>
                <span style={mono}>{row.id}</span>
                <span><b>{row.name}</b><br /><span style={{ color: C.sub, fontSize: 10, lineHeight: 1.45 }}>{row.rationale}</span>{row.blockers.length > 0 && <span style={{ ...mono, display: "block", color: C.sub, fontSize: 9, marginTop: 4 }}>BLOCKERS · {row.blockers.join(", ")}</span>}</span>
                <span><Pill tone={toneFor(row.expectedRecommendation)}>{row.expectedRecommendation}</Pill></span>
                <span><Pill tone={toneFor(row.predictedRecommendation)}>{row.predictedRecommendation}</Pill></span>
                <span><Pill tone={row.correct ? { color: C.teal, background: C.tealSoft } : { color: C.fail, background: C.failSoft }}>{row.correct ? "MATCH" : "MISS"}</Pill></span>
              </div>)}
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: 10 }}>
          <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>WHAT THIS MEASURES</div>
            <b style={{ display: "block", margin: "5px 0" }}>Decision behavior</b>
            Package and document-specific rules, human-review routing, deterministic contradictions, and final recommendation behavior.
          </div>
          <div style={{ background: C.reviewSoft, color: C.review, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>WHAT THIS DOES NOT MEASURE</div>
            <b style={{ display: "block", margin: "5px 0" }}>OCR or extraction accuracy</b>
            These 10 cases use labeled structured evidence. They do not prove Azure OCR, document classification, field extraction, latency, or cost performance on unseen PDFs.
          </div>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, color: C.sub, fontSize: 9, fontWeight: 800 }}>NEXT BENCHMARK</div>
            <b style={{ display: "block", margin: "5px 0" }}>PDF-level evaluation</b>
            Run labeled synthetic PDFs through Azure and score page classification, field extraction, evidence localization, latency, and processing cost separately from decision accuracy.
          </div>
        </aside>
      </section>
    </div>
  </main>;
}

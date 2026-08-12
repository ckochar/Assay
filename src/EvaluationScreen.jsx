import React from "react";
import { GOLDEN_EVALUATION_CASES } from "./data/goldenEvaluationCases.js";
import { evaluateGoldenCases } from "./domain/goldenEvaluation.js";
import {
  PDF_EVALUATION_BASELINE_META,
  PDF_EVALUATION_BASELINE_ROWS,
  PDF_EVALUATION_BASELINE_SUMMARY,
} from "./data/pdfEvaluationBaseline.js";
import {
  PDF_STRESS_BASELINE_META,
  PDF_STRESS_BASELINE_ROWS,
  PDF_STRESS_BASELINE_SUMMARY,
} from "./data/pdfStressBaseline.js";

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

function seconds(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function toneFor(value) {
  if (value === "Ready for Review") return { color: C.teal, background: C.tealSoft };
  if (value === "Exception Identified") return { color: C.fail, background: C.failSoft };
  return { color: C.review, background: C.reviewSoft };
}

function Pill({ children, tone }) {
  return <span style={{ ...mono, ...tone, display: "inline-flex", borderRadius: 999, padding: "4px 7px", fontSize: 9.5, fontWeight: 800 }}>{children}</span>;
}

function MetricGrid({ cards }) {
  return <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9, marginTop: 14 }}>
    {cards.map(([value, label, emphasize = false]) => <div key={label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 23, fontWeight: 850, color: emphasize ? C.teal : C.ink }}>{value}</div>
      <div style={{ ...mono, color: C.sub, fontSize: 9.5, marginTop: 5 }}>{label.toUpperCase()}</div>
    </div>)}
  </section>;
}

export default function EvaluationScreen() {
  const evaluation = evaluateGoldenCases(GOLDEN_EVALUATION_CASES);
  const { metrics, rows } = evaluation;
  const decisionCards = [
    [metrics.totalCases, "Labeled cases"],
    [pct(metrics.recommendationAccuracy), "Recommendation accuracy"],
    [metrics.falseReady, "False-ready packages", metrics.falseReady === 0],
    [metrics.falseException, "False exceptions"],
    [metrics.missedException, "Missed exceptions"],
    [pct(metrics.automationRate), "Ready recommendation rate"],
  ];
  const pdf = PDF_EVALUATION_BASELINE_SUMMARY;
  const pdfCards = [
    [`${pdf.packages} / ${pdf.pagesAnalyzed}`, "Packages / pages"],
    [pct(pdf.classificationAccuracy), "Page classification", pdf.classificationAccuracy === 1],
    [pct(pdf.extractionAccuracy), "Labeled field extraction", pdf.extractionAccuracy === 1],
    [pct(pdf.evidenceSourcePageAccuracy), "Evidence source page", pdf.evidenceSourcePageAccuracy === 1],
    [`${pdf.recommendationCorrect}/${pdf.packages}`, "Recommendation match"],
    [pdf.falseReady, "False-ready packages", pdf.falseReady === 0],
    [seconds(pdf.p50LatencyMs), "P50 latency"],
    [seconds(pdf.p95LatencyMs), "P95 latency"],
  ];
  const stress = PDF_STRESS_BASELINE_SUMMARY;
  const stressCards = [
    [`${stress.packages} / ${stress.pagesAnalyzed}`, "Packages / pages"],
    [`${stress.classificationCorrect}/${stress.classificationTotal}`, "Page classification", stress.classificationAccuracy === 1],
    [`${stress.extractionCorrect}/${stress.extractionTotal}`, "Labeled fields", stress.extractionAccuracy === 1],
    [`${stress.evidenceCorrect}/${stress.evidenceTotal}`, "Evidence source page", stress.evidenceSourcePageAccuracy === 1],
    [`${stress.recommendationCorrect}/${stress.packages}`, "Recommendation match"],
    [stress.falseReady, "False-ready packages", stress.falseReady === 0],
    [seconds(stress.p50LatencyMs), "P50 latency"],
    [seconds(stress.p95LatencyMs), "P95 latency"],
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

      <MetricGrid cards={decisionCards} />

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
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>BOUNDARY</div>
            <b style={{ display: "block", margin: "5px 0" }}>Structured evidence benchmark</b>
            These 10 cases isolate decision logic. They do not count as OCR or document-AI accuracy tests; those are measured separately below.
          </div>
        </aside>
      </section>

      <section style={{ marginTop: 28, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 22 }}>
        <div style={{ ...mono, color: C.teal, fontSize: 9.5, fontWeight: 800 }}>PDF / AZURE BASELINE · CONTROLLED DIGITAL FIXTURES</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap", marginTop: 6 }}>
          <div style={{ maxWidth: 790 }}>
            <h2 style={{ margin: 0, fontSize: 23 }}>Does the end-to-end PDF path preserve the right evidence and routing?</h2>
            <p style={{ color: C.sub, fontSize: 12, lineHeight: 1.6, margin: "8px 0 0" }}>Five labeled eight-page synthetic PDFs were processed through the live Azure OCR/layout path, Assay document classification and extraction, evidence linking, deterministic QC, and final recommendation logic. This is an initial controlled baseline, not a production accuracy benchmark.</p>
          </div>
          <div style={{ background: pdf.releaseGatePassed ? C.tealSoft : C.failSoft, color: pdf.releaseGatePassed ? C.teal : C.fail, borderRadius: 10, padding: "11px 13px", minWidth: 215 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>PDF SAFETY GATE</div>
            <div style={{ fontSize: 16, fontWeight: 850, marginTop: 4 }}>{pdf.releaseGatePassed ? "PASS · 0 false-ready" : "FAIL · investigate"}</div>
          </div>
        </div>
      </section>

      <MetricGrid cards={pdfCards} />

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 14, alignItems: "start" }}>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
          <div style={{ padding: "14px 15px", borderBottom: `1px solid ${C.line}` }}>
            <b>Measured PDF scenarios</b>
            <div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>All five packages were synthetic digital PDFs generated from version-controlled fixtures. Each package contained eight pages.</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 920 }}>
              <div style={{ display: "grid", gridTemplateColumns: "74px minmax(195px,1fr) 100px 100px 100px 155px 92px", gap: 9, padding: "9px 14px", background: "#eef2f0", ...mono, color: C.sub, fontSize: 9 }}>
                <span>CASE</span><span>SCENARIO</span><span>CLASSIFY</span><span>EXTRACT</span><span>EVIDENCE</span><span>RECOMMENDATION</span><span>LATENCY</span>
              </div>
              {PDF_EVALUATION_BASELINE_ROWS.map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "74px minmax(195px,1fr) 100px 100px 100px 155px 92px", gap: 9, padding: "12px 14px", borderTop: `1px solid ${C.line}`, alignItems: "center", fontSize: 10.5 }}>
                <span style={mono}>{row.id}</span>
                <span><b>{row.name}</b><br /><span style={{ color: C.sub, fontSize: 9.5 }}>{row.category}</span></span>
                <span style={mono}>{row.classification.correct}/{row.classification.total}</span>
                <span style={mono}>{row.extraction.correct}/{row.extraction.total}</span>
                <span style={mono}>{row.evidence.correct}/{row.evidence.total}</span>
                <span><Pill tone={toneFor(row.predictedRecommendation)}>{row.predictedRecommendation}</Pill></span>
                <span style={mono}>{seconds(row.latencyMs)}</span>
              </div>)}
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: 10 }}>
          <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>PROVIDER PATH</div>
            <b style={{ display: "block", margin: "5px 0" }}>{PDF_EVALUATION_BASELINE_META.provider}</b>
            {PDF_EVALUATION_BASELINE_META.modelId} · API {PDF_EVALUATION_BASELINE_META.apiVersion}. The configured F0 resource was handled as four sequential two-page requests per eight-page package, then recombined with original package page numbers.
          </div>
          <div style={{ background: C.reviewSoft, color: C.review, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>LIMITATIONS</div>
            <b style={{ display: "block", margin: "5px 0" }}>Do not generalize 100%</b>
            Digital synthetic text only. This baseline does not cover scanned-image degradation, handwriting, skew/blur, or broad unseen layouts. Cost was not instrumented.
          </div>
        </aside>
      </section>

      <section style={{ marginTop: 28, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 22 }}>
        <div style={{ ...mono, color: C.blue, fontSize: 9.5, fontWeight: 800 }}>DOCUMENT AI STRESS · CONTROLLED DIGITAL PDFS</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap", marginTop: 6 }}>
          <div style={{ maxWidth: 790 }}>
            <h2 style={{ margin: 0, fontSize: 23 }}>What breaks when the package shape gets less comfortable?</h2>
            <p style={{ color: C.sub, fontSize: 12, lineHeight: 1.6, margin: "8px 0 0" }}>Three additional eight-page synthetic PDFs tested orientation metadata, compact low-contrast typography, and a structural package defect. These are digital-document stresses, not rasterized scan tests.</p>
          </div>
          <div style={{ background: stress.releaseGatePassed ? C.tealSoft : C.failSoft, color: stress.releaseGatePassed ? C.teal : C.fail, borderRadius: 10, padding: "11px 13px", minWidth: 215 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>STRESS SAFETY GATE</div>
            <div style={{ fontSize: 16, fontWeight: 850, marginTop: 4 }}>{stress.releaseGatePassed ? "PASS · 0 false-ready" : "FAIL · investigate"}</div>
          </div>
        </div>
      </section>

      <MetricGrid cards={stressCards} />

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 14, alignItems: "start" }}>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
          <div style={{ padding: "14px 15px", borderBottom: `1px solid ${C.line}` }}>
            <b>Measured stress scenarios</b>
            <div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>The published result uses the final post-fix STRESS-003 rerun under {PDF_STRESS_BASELINE_META.profile}.</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1040 }}>
              <div style={{ display: "grid", gridTemplateColumns: "88px minmax(180px,1fr) 86px 86px 86px 150px 78px minmax(250px,1.2fr)", gap: 9, padding: "9px 14px", background: "#eef2f0", ...mono, color: C.sub, fontSize: 9 }}>
                <span>CASE</span><span>STRESS</span><span>CLASSIFY</span><span>EXTRACT</span><span>EVIDENCE</span><span>ASSAY</span><span>LATENCY</span><span>OBSERVATION</span>
              </div>
              {PDF_STRESS_BASELINE_ROWS.map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "88px minmax(180px,1fr) 86px 86px 86px 150px 78px minmax(250px,1.2fr)", gap: 9, padding: "12px 14px", borderTop: `1px solid ${C.line}`, alignItems: "start", fontSize: 10.5 }}>
                <span style={mono}>{row.id}</span>
                <span><b>{row.name}</b><br /><span style={{ color: C.sub, fontSize: 9.5 }}>{row.category}</span></span>
                <span style={mono}>{row.classification.correct}/{row.classification.total}</span>
                <span style={mono}>{row.extraction.correct}/{row.extraction.total}</span>
                <span style={mono}>{row.evidence.correct}/{row.evidence.total}</span>
                <span><Pill tone={toneFor(row.predictedRecommendation)}>{row.predictedRecommendation}</Pill></span>
                <span style={mono}>{seconds(row.latencyMs)}</span>
                <span style={{ color: C.sub, lineHeight: 1.45 }}>{row.observation}</span>
              </div>)}
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: 10 }}>
          <div style={{ background: C.tealSoft, color: C.teal, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>BENCHMARK → PRODUCT CHANGE</div>
            <b style={{ display: "block", margin: "5px 0" }}>A real gap was found and fixed</b>
            STRESS-003 initially showed that Azure correctly omitted a missing Notary document, while Assay had no profile-driven required-document control. Assay added <span style={mono}>PKG-DOC-REQ-001</span>, versioned the fictional TX profile to 2.2.0, and the rerun produced the expected exception.
          </div>
          <div style={{ background: C.reviewSoft, color: C.review, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>BOUNDARY</div>
            <b style={{ display: "block", margin: "5px 0" }}>Still not a scan benchmark</b>
            Rotation and compact layout are digital PDF manipulations. Handwriting, low-DPI raster scans, blur, noise, scan compression, and severe image degradation remain unmeasured. Cost was not instrumented.
          </div>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.55 }}>
            <div style={{ ...mono, color: C.sub, fontSize: 9, fontWeight: 800 }}>NEXT RELIABILITY STEP</div>
            <b style={{ display: "block", margin: "5px 0" }}>True raster / scan stress</b>
            Add a small free-tier-safe set of rasterized low-resolution pages, controlled blur/noise/skew, and unseen layout variants before broadening any accuracy claim.
          </div>
        </aside>
      </section>
    </div>
  </main>;
}

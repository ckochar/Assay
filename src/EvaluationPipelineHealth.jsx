import React from "react";
import { FAILURE_TAXONOMY, RASTER_LEARNING_V1 } from "./data/failureTaxonomy.js";
import OperationalAiTelemetry from "./OperationalAiTelemetry.jsx";

const C = {
  panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", blue: "#215f87", blueSoft: "#e8f1f7",
  review: "#93620a", reviewSoft: "#f8efd9", fail: "#ad312b", failSoft: "#fae9e7",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

const PIPELINE = [
  { key: "input", label: "1 · Input / provider", question: "Did the provider process the package?", measure: "Page count, provider status, throttling, latency", status: "Measured", tone: "blue" },
  { key: "ocr", label: "2 · Document intelligence", question: "Did OCR recognize enough usable content?", measure: "Words, lines, text-bearing pages, coverage, confidence", status: "Coverage instrumentation pending", tone: "review" },
  { key: "understand", label: "3 · Classification / extraction", question: "Did Assay understand the package correctly?", measure: "Document classification and labeled field accuracy", status: "Measured by benchmark layer", tone: "blue" },
  { key: "evidence", label: "4 · Evidence provenance", question: "Can each material claim be traced to source evidence?", measure: "Source page, excerpt, geometry, evidence completeness", status: "Measured", tone: "teal" },
  { key: "decision", label: "5 · Deterministic decision", question: "Did controls produce the expected routing?", measure: "Rule result, blocker, recommendation, false-ready rate", status: "Safety gate active", tone: "teal" },
  { key: "human", label: "6 · Human accountability", question: "Was uncertainty left with a reviewer instead of hidden?", measure: "Needs Review, corrections, overrides, final disposition, audit context", status: "Prototype workflow live", tone: "teal" },
];

function tone(name) {
  if (name === "teal") return { color: C.teal, background: C.tealSoft };
  if (name === "review") return { color: C.review, background: C.reviewSoft };
  if (name === "fail") return { color: C.fail, background: C.failSoft };
  return { color: C.blue, background: C.blueSoft };
}

function Stat({ value, label, danger = false, safe = false }) {
  return <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, background: C.panel }}>
    <div style={{ fontSize: 21, fontWeight: 850, color: danger ? C.fail : safe ? C.teal : C.ink }}>{value}</div>
    <div style={{ ...mono, color: C.sub, fontSize: 8.7, marginTop: 4 }}>{label.toUpperCase()}</div>
  </div>;
}

export default function EvaluationPipelineHealth() {
  const criticalFailures = FAILURE_TAXONOMY.filter((item) => item.severity === "Critical");
  const raster = RASTER_LEARNING_V1;

  return <>
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 22 }}>
      <div style={{ ...mono, color: C.blue, fontSize: 9.5, fontWeight: 800 }}>AI SYSTEM HEALTH · LAYERED EVALUATION</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "start", flexWrap: "wrap", marginTop: 6 }}>
        <div style={{ maxWidth: 790 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Where did the AI system succeed, fail, and route safely?</h1>
          <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.65, margin: "8px 0 0" }}>Assay evaluates reliability as a pipeline, not one model score. Provider health, OCR coverage, classification, extraction, evidence, deterministic controls, and human review are measured separately so a failure at one layer cannot silently become confidence at the next.</p>
        </div>
        <div style={{ background: C.tealSoft, color: C.teal, borderRadius: 10, padding: "11px 13px", minWidth: 220 }}>
          <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>PRIMARY SAFETY OBJECTIVE</div>
          <div style={{ fontSize: 16, fontWeight: 850, marginTop: 4 }}>0 false-ready packages</div>
          <div style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.4 }}>Insufficient evidence must review or stop—not become Ready.</div>
        </div>
      </div>
    </section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 9, marginTop: 14 }}>
      {PIPELINE.map((stage) => <div key={stage.key} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 14 }}>
        <div style={{ ...mono, color: C.sub, fontSize: 8.8, fontWeight: 800 }}>{stage.label.toUpperCase()}</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 7, lineHeight: 1.4 }}>{stage.question}</div>
        <div style={{ color: C.sub, fontSize: 10.3, lineHeight: 1.5, marginTop: 5 }}>{stage.measure}</div>
        <span style={{ ...mono, ...tone(stage.tone), display: "inline-flex", borderRadius: 999, padding: "4px 7px", fontSize: 8.4, fontWeight: 800, marginTop: 10 }}>{stage.status}</span>
      </div>)}
    </section>

    <OperationalAiTelemetry />

    <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(280px,.65fr)", gap: 14, alignItems: "stretch" }}>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 17 }}>
        <div style={{ ...mono, color: C.fail, fontSize: 9, fontWeight: 800 }}>OPEN LEARNING · TRUE RASTER PATH</div>
        <h2 style={{ fontSize: 20, margin: "7px 0 0" }}>Acceptable OCR confidence did not mean usable document understanding.</h2>
        <p style={{ color: C.sub, fontSize: 11.5, lineHeight: 1.6, margin: "8px 0 0" }}>Two image-only eight-page packages were rerun after the word-to-line fallback. The fallback did not recover classification, extraction, or evidence. Both packages still routed to Needs Review, so the downstream safety behavior held. The next raster experiment must instrument OCR coverage and provider output shape before another algorithm change.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginTop: 13 }}>
          <Stat value={`${raster.classificationCorrect}/${raster.classificationTotal}`} label="Page classifications" danger />
          <Stat value={`${raster.extractionCorrect}/${raster.extractionTotal}`} label="Labeled fields" danger />
          <Stat value={`${raster.evidenceCorrect}/${raster.evidenceTotal}`} label="Evidence locations" danger />
          <Stat value={`${raster.recommendationCorrect}/${raster.cases}`} label="Safe routing matches" safe />
          <Stat value={raster.falseReady} label="False-ready" safe />
        </div>
      </div>

      <aside style={{ background: C.reviewSoft, color: C.review, borderRadius: 11, padding: 17 }}>
        <div style={{ ...mono, fontSize: 9, fontWeight: 800 }}>WHY THIS MATTERS</div>
        <b style={{ display: "block", fontSize: 15, marginTop: 7 }}>Confidence is not coverage.</b>
        <p style={{ fontSize: 11, lineHeight: 1.6, margin: "7px 0 0" }}>Average word confidence only describes words Azure returned. It does not prove that Azure recognized enough of the page. Assay now treats OCR coverage, evidence completeness, and routing safety as separate signals.</p>
        <div style={{ borderTop: "1px solid rgba(147,98,10,.2)", marginTop: 12, paddingTop: 12 }}>
          <div style={{ ...mono, fontSize: 8.7, fontWeight: 800 }}>NEXT DIAGNOSTIC</div>
          <div style={{ fontSize: 10.8, lineHeight: 1.55, marginTop: 5 }}>Capture words/page, lines/page, text characters, pages with OCR, confidence distribution, and provider response shape on the next raster run.</div>
        </div>
      </aside>
    </section>

    <section style={{ marginTop: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: "hidden" }}>
      <div style={{ padding: "14px 15px", borderBottom: `1px solid ${C.line}` }}>
        <b>Failure taxonomy</b>
        <div style={{ color: C.sub, fontSize: 10.5, marginTop: 3 }}>{FAILURE_TAXONOMY.length} explicit failure classes across the AI system; {criticalFailures.length} are treated as critical routing/safety concerns.</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 940 }}>
          <div style={{ display: "grid", gridTemplateColumns: "175px 150px minmax(210px,1fr) minmax(300px,1.35fr)", gap: 10, padding: "9px 14px", background: "#eef2f0", ...mono, color: C.sub, fontSize: 8.8 }}>
            <span>FAILURE</span><span>LAYER</span><span>SIGNAL</span><span>SAFE BEHAVIOR</span>
          </div>
          {FAILURE_TAXONOMY.map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "175px 150px minmax(210px,1fr) minmax(300px,1.35fr)", gap: 10, padding: "11px 14px", borderTop: `1px solid ${C.line}`, alignItems: "start", fontSize: 10.4 }}>
            <span><span style={mono}>{item.id}</span><br /><span style={{ color: C.sub, fontSize: 9.4 }}>{item.failure}</span></span>
            <span>{item.layer}</span>
            <span style={{ color: C.sub, lineHeight: 1.45 }}>{item.signal}</span>
            <span style={{ lineHeight: 1.45 }}>{item.safeBehavior}</span>
          </div>)}
        </div>
      </div>
    </section>

    <div style={{ ...mono, color: C.sub, fontSize: 9, margin: "14px 2px 20px" }}>DETAILED BENCHMARKS BELOW · decision logic, controlled digital PDFs, and digital stress remain separate measurement slices.</div>
  </>;
}

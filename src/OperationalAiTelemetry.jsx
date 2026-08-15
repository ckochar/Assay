import React from "react";
import { OPERATIONAL_TELEMETRY_V1 } from "./data/operationalTelemetry.js";
import { summarizeAiTelemetry } from "./domain/aiTelemetry.js";

const C = {
  panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft: "#e4f0ee", blue: "#215f87", blueSoft: "#e8f1f7",
  review: "#93620a", reviewSoft: "#f8efd9", fail: "#ad312b", failSoft: "#fae9e7",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

function pct(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "Not instrumented";
}

function seconds(ms) {
  return Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)}s` : "—";
}

function Metric({ label, value, helper, tone = "default" }) {
  const palette = tone === "safe" ? { color: C.teal, bg: C.tealSoft } : tone === "review" ? { color: C.review, bg: C.reviewSoft } : { color: C.ink, bg: C.panel };
  return <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, background: palette.bg }}>
    <div style={{ fontSize: 20, fontWeight: 850, color: palette.color }}>{value}</div>
    <div style={{ ...mono, color: C.sub, fontSize: 8.6, marginTop: 4 }}>{label.toUpperCase()}</div>
    {helper && <div style={{ color: C.sub, fontSize: 9.5, marginTop: 5, lineHeight: 1.4 }}>{helper}</div>}
  </div>;
}

export default function OperationalAiTelemetry() {
  const telemetry = OPERATIONAL_TELEMETRY_V1;
  const summary = summarizeAiTelemetry(telemetry.events);
  const missingCoverage = telemetry.events.filter((row) => !Number.isFinite(row.ocrPageCoverage)).length;

  return <section style={{ marginTop: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 17 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
      <div style={{ maxWidth: 760 }}>
        <div style={{ ...mono, color: C.blue, fontSize: 9, fontWeight: 800 }}>OPERATIONAL AI TELEMETRY · CONTROLLED BENCHMARKS</div>
        <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>What would we monitor before trusting this workflow at scale?</h2>
        <p style={{ color: C.sub, fontSize: 11.2, lineHeight: 1.6, margin: "7px 0 0" }}>This view turns benchmark outputs into operating signals: throughput shape, provider-call footprint, latency, human-review demand, evidence completeness, and review triggers. Missing telemetry stays visible instead of being estimated.</p>
      </div>
      <div style={{ background: C.blueSoft, color: C.blue, borderRadius: 9, padding: "10px 12px", maxWidth: 330, fontSize: 10.2, lineHeight: 1.5 }}><b>Prototype boundary:</b> {telemetry.caveat}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8, marginTop: 14 }}>
      <Metric label="Packages observed" value={summary.totalPackages} helper={`${summary.totalPages} pages · ${summary.totalProviderCalls} provider calls`} />
      <Metric label="Human-review rate" value={pct(summary.humanReviewRate)} helper="Includes review and deterministic exceptions" tone="review" />
      <Metric label="Straight-through rate" value={pct(summary.straightThroughRate)} helper="No reviewer required before next step" />
      <Metric label="Exception rate" value={pct(summary.exceptionRate)} helper="Deterministic exception recommendation" />
      <Metric label="P50 latency" value={seconds(summary.p50LatencyMs)} helper={`P95 ${seconds(summary.p95LatencyMs)}`} />
      <Metric label="Evidence completeness" value={pct(summary.averageEvidenceCompleteness)} helper="Across captured expected evidence" />
      <Metric label="False ready" value={summary.falseReady} helper="Primary safety release gate" tone="safe" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(260px,.8fr)", gap: 12, marginTop: 12 }}>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "11px 12px", background: "#eef2f0" }}><b style={{ fontSize: 11.5 }}>Top human-review triggers</b></div>
        {summary.topReviewTriggers.slice(0, 6).map((item) => <div key={item.trigger} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 12px", borderTop: `1px solid ${C.line}`, fontSize: 10.5 }}><span>{item.trigger}</span><span style={mono}>{item.count}</span></div>)}
      </div>

      <aside style={{ background: missingCoverage ? C.reviewSoft : C.tealSoft, color: missingCoverage ? C.review : C.teal, borderRadius: 10, padding: 13 }}>
        <div style={{ ...mono, fontSize: 8.7, fontWeight: 800 }}>OBSERVABILITY GAP</div>
        <div style={{ fontSize: 14, fontWeight: 850, marginTop: 5 }}>{missingCoverage}/{summary.totalPackages} runs lack OCR page-coverage telemetry</div>
        <p style={{ fontSize: 10.4, lineHeight: 1.55, margin: "6px 0 0" }}>Average word confidence is available only for the raster reruns; page coverage was not captured. The next bounded raster run should populate this field before any new OCR fix is attempted.</p>
      </aside>
    </div>
  </section>;
}

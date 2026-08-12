import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const C = {
  ink: "#14211d",
  sub: "#60706a",
  line: "#dfe6e2",
  panel: "#ffffff",
  bg: "#eef2f0",
  teal: "#0d6259",
  highlight: "rgba(245, 183, 46, 0.22)",
  highlightStroke: "#b87900",
};

function normalizePolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 4) return [];
  if (typeof polygon[0] === "number") {
    const points = [];
    for (let index = 0; index < polygon.length - 1; index += 2) {
      points.push({ x: Number(polygon[index]), y: Number(polygon[index + 1]) });
    }
    return points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  return polygon
    .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

export function evidencePolygonToViewport(evidence, viewport) {
  const points = normalizePolygon(evidence?.polygon);
  const sourceWidth = Number(evidence?.pageGeometry?.width);
  const sourceHeight = Number(evidence?.pageGeometry?.height);
  if (!points.length || !sourceWidth || !sourceHeight || !viewport?.width || !viewport?.height) return [];
  return points.map((point) => ({
    x: (point.x / sourceWidth) * viewport.width,
    y: (point.y / sourceHeight) * viewport.height,
  }));
}

export default function PdfEvidenceViewer({ file, evidence, onPageChange }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(evidence?.page || 1);
  const [viewport, setViewport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!file) {
        setPdf(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const document = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (!cancelled) setPdf(document);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Unable to render PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    const targetPage = Math.max(1, Number(evidence?.page) || 1);
    setPageNumber(targetPage);
  }, [evidence?.page]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!pdf || !canvasRef.current) return;
      setLoading(true);
      setError("");
      try {
        const safePage = Math.min(Math.max(pageNumber, 1), pdf.numPages);
        if (safePage !== pageNumber) setPageNumber(safePage);
        const page = await pdf.getPage(safePage);
        const nextViewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        canvas.width = Math.floor(nextViewport.width);
        canvas.height = Math.floor(nextViewport.height);
        renderTaskRef.current?.cancel?.();
        const task = page.render({ canvasContext: context, viewport: nextViewport });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) {
          setViewport({ width: nextViewport.width, height: nextViewport.height });
          onPageChange?.(safePage);
        }
      } catch (renderError) {
        if (renderError?.name !== "RenderingCancelledException" && !cancelled) {
          setError(renderError.message || "Unable to render PDF page");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [pdf, pageNumber, onPageChange]);

  const polygon = useMemo(
    () => evidencePolygonToViewport(evidence, viewport),
    [evidence, viewport],
  );
  const polygonPoints = polygon.map((point) => `${point.x},${point.y}`).join(" ");
  const pageCount = pdf?.numPages || 0;

  return (
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Source document</div>
          <div style={{ color: C.sub, fontSize: 10 }}>{file?.name || "Select a PDF"}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button type="button" onClick={() => setPageNumber((value) => Math.max(1, value - 1))} disabled={!pdf || pageNumber <= 1}>←</button>
          <span style={{ fontSize: 11, color: C.sub }}>Page {pageNumber}{pageCount ? ` / ${pageCount}` : ""}</span>
          <button type="button" onClick={() => setPageNumber((value) => Math.min(pageCount || value, value + 1))} disabled={!pdf || pageNumber >= pageCount}>→</button>
        </div>
      </div>

      <div style={{ padding: 10, background: C.bg, maxHeight: "76vh", overflow: "auto", textAlign: "center" }}>
        {!file && <div style={{ padding: 40, color: C.sub }}>Choose or generate a PDF to inspect evidence.</div>}
        {error && <div style={{ padding: 20, color: "#ad312b" }}>{error}</div>}
        {file && (
          <div style={{ position: "relative", display: "inline-block", width: "min(100%, 820px)", lineHeight: 0, boxShadow: "0 8px 28px rgba(20,33,29,.12)" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block", background: "white" }} />
            {viewport && polygonPoints && Number(evidence?.page) === pageNumber && (
              <svg
                viewBox={`0 0 ${viewport.width} ${viewport.height}`}
                preserveAspectRatio="none"
                aria-label="Highlighted source evidence"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
              >
                <polygon
                  points={polygonPoints}
                  fill={C.highlight}
                  stroke={C.highlightStroke}
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>
        )}
        {loading && <div style={{ color: C.teal, fontSize: 11, paddingTop: 8 }}>Rendering evidence…</div>}
      </div>

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.sub }}>
        {evidence ? <><b style={{ color: C.ink }}>Evidence:</b> Page {evidence.page} · {evidence.excerpt}</> : "Select a QC finding to highlight its source evidence."}
      </div>
    </section>
  );
}

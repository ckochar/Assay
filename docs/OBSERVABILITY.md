# Assay AI observability

Assay treats observability as a product-safety capability, not a decorative monitoring dashboard.

The operating question is: **when a package does not behave as expected, can we identify the layer that failed without confusing model confidence with end-to-end system health?**

## Current telemetry layer

`/evaluation` includes controlled benchmark telemetry derived from previously measured synthetic PDF/raster runs. It is intentionally labeled as prototype telemetry, not production traffic or SLA reporting.

The current aggregation supports:

- package and page volume
- provider-call footprint
- human-review rate
- straight-through rate
- deterministic exception rate
- P50/P95 latency
- evidence completeness
- false-ready count
- review-trigger frequency
- OCR coverage and confidence when those signals were actually captured

## Missing data is a first-class state

The initial raster reruns captured average Azure word confidence but did **not** capture page-level OCR coverage. Those coverage fields remain `null` in the telemetry dataset.

Assay does not infer or estimate missing coverage from confidence. This is deliberate because the raster failure demonstrated that high confidence on recognized words can coexist with unusable overall document understanding.

## Next measured-run contract

A future bounded raster diagnostic should capture, at minimum:

1. package pages analyzed
2. Azure chunk/provider-call count
3. total latency
4. words per page
5. lines per page
6. text characters per page
7. pages with any OCR text
8. page-level OCR coverage ratio
9. average/min/max word confidence
10. classification/extraction confidence
11. evidence completeness
12. review trigger(s)
13. rules evaluated
14. final recommendation
15. false-ready outcome

The goal is not to maximize dashboards. The goal is to make the next engineering/product decision evidence-based: **observe → diagnose → fix → evaluate**.

## Portfolio boundary

The current telemetry layer uses controlled synthetic benchmark data and in-memory/static aggregation. It is not a durable event store, production monitoring platform, customer analytics system, or paid observability stack.

The project remains constrained to $0 operation. No paid monitoring service is required for this milestone.

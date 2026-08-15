# Observability milestone update

Status: **Delivered for controlled benchmark telemetry; live-run wiring remains next.**

This increment adds a lightweight operating-metric aggregation layer and `/evaluation` UX for package/page volume, provider-call footprint, human-review rate, straight-through rate, deterministic exception rate, P50/P95 latency, evidence completeness, false-ready count, review triggers, and explicit instrumentation gaps.

The milestone deliberately does **not** claim production monitoring. The current data source is previously measured synthetic benchmark runs. Metrics unavailable in those runs remain `null`; specifically, OCR page coverage is still uninstrumented for the measured raster reruns.

Next reliability action: wire the same telemetry contract into one tightly bounded future raster diagnostic, capture real page-level coverage/provider output shape, diagnose the failure, and only then decide whether another OCR/normalization change is warranted.

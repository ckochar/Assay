# Assay

Assay is an **AI-assisted post-execution mortgage document QC product** that turns a synthetic executed PDF package into evidence-backed findings and a human-accountable disposition.

**Live product:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Human Review:** https://assay-navy.vercel.app/human-review  
**Reliability Evaluation:** https://assay-navy.vercel.app/evaluation

> Assay is an independent portfolio prototype built with synthetic/sample data. It is not legal, lending, compliance, notarization, or underwriting software and should not be used with real customer or borrower information.

## Product thesis

**AI extracts evidence. Deterministic controls evaluate it. Humans remain accountable.**

Assay is designed around six principles:

1. **Evidence first** — material findings point back to source document, page, excerpt, and available geometry.
2. **Deterministic decisioning** — OCR/document AI supplies evidence; transparent controls evaluate business rules.
3. **Fail-safe routing** — missing, conflicting, low-confidence, or incomplete evidence routes to review instead of silently becoming ready.
4. **Version traceability** — evaluations pin profile and extractor context.
5. **Human accountability** — correction, override, return, authorized exception, and final disposition remain explicit human actions.
6. **Measured reliability** — pipeline layers are evaluated separately, with **zero false-ready packages** as the primary safety gate.

## Current product flow

```text
Synthetic/sample PDF
        |
        v
Vercel package API
validation + F0-aware PDF batching
        |
        v
Azure AI Document Intelligence
OCR + layout + page geometry
        |
        v
Normalization + package intelligence
classification + extraction + evidence
        |
        v
Deterministic QC controls
profile context + blockers + recommendation
        |
        v
Human review
verify evidence -> correct / override / return / dispose
        |
        v
Audit + evaluation context
```

### Package Intelligence

`/package` accepts a synthetic/sample combined mortgage PDF and analyzes the first **8 pages** with Azure AI Document Intelligence `prebuilt-layout`. The current pipeline validates PDFs, splits them into provider-sized requests when required by F0, recombines original page numbers, classifies pages, builds document segments/inventory, extracts package context and evidence, resolves fictional TX/CA/FL sample profiles when supported, and applies deterministic package/document controls.

Representative document types include Promissory Note, Mortgage/Deed of Trust, Closing Disclosure, Notice of Right to Cancel, Occupancy Affidavit, Signature/Name Affidavit, and Notary Acknowledgment.

Signature/notary **legal validity is never inferred from OCR text alone**. Evidence requiring visual or legal judgment remains human-reviewed.

### Evidence-backed reviewer

The QC workspace supports Pass / Fail / Needs Review findings, source-page evidence, PDF.js viewing, Azure evidence polygons where available, funding blockers, return-for-correction, structured overrides, optional second approval, final disposition, audit history, and pinned evaluation context.

### Human Review: correction is not override

`/human-review` demonstrates the human-in-the-loop correction pattern for three bounded field types:

- borrower names
- execution date
- document classification

A correction changes an extracted value and **reruns the impacted deterministic control**. Assay preserves the original AI value, the human-entered value, evidence context, rule-status change, recommendation change, reviewer, and note in audit history.

A correction does **not** automatically clear a finding. If the human value still conflicts with the pinned reference/evidence, the finding remains `Needs Review`. This is intentionally distinct from an override or authorized policy exception.

The UX principle is exception-first: the reviewer should understand **what is wrong, what source evidence supports the correction, what the AI originally extracted, what they changed, and what changed after re-evaluation** without navigating through a technical console.

## Reliability evaluation

`/evaluation` now presents reliability as an AI-system pipeline rather than one accuracy score:

**provider → OCR/document intelligence → classification/extraction → evidence provenance → deterministic decision → human accountability**

### Decision-layer golden set

- **10 / 10** recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions

### Initial clean PDF / Azure baseline

Five controlled synthetic **digital-text** eight-page PDFs:

- **40 / 40** expected page classifications
- **50 / 50** labeled field values
- **44 / 44** expected evidence source pages with evidence present
- **5 / 5** package recommendation matches
- **0** false ready
- P50 **12.36 s** / P95 **12.71 s**

These are controlled fixtures, not a production-generalization claim.

### Digital PDF stress v1

Three controlled eight-page cases covering PDF rotation metadata, compact/lighter digital layout, and duplicated/missing package structure:

- **24 / 24** classifications
- **30 / 30** labeled fields
- **25 / 25** evidence source pages
- **3 / 3** recommendation matches
- **0** false ready
- P50 **12.36 s** / P95 **12.52 s**

This benchmark exposed a missing product control. A confidently missing configured Notary document was visible upstream, but Assay initially lacked a profile-driven required-document rule. That led to `PKG-DOC-REQ-001`, versioned profile data, regression tests, and a correct `Exception Identified` rerun.

### True raster / scan learning

Assay now also has **image-only PDF fixtures with no PDF text layer**. Two eight-page raster packages were run through the real Azure F0 → Assay path after adding a words-to-lines fallback.

Measured post-fix result:

- RASTER-001: **0 / 8** classifications, **0 / 10** labeled fields, **0 / 9** evidence locations
- RASTER-002: **0 / 8** classifications, **0 / 10** labeled fields, **0 / 9** evidence locations
- Azure average word confidence was still approximately **0.860** and **0.933** respectively
- both packages safely routed to **Needs Review**
- **0 false-ready packages**

This produced an important product learning: **confidence is not coverage**. A provider can be confident in the subset of words it recognized while still recognizing too little of the page for downstream understanding. Assay therefore added an explicit failure taxonomy and document-intelligence diagnostics for word/line/text coverage, page-level OCR presence, confidence distribution, and provider output shape.

The next raster step is **diagnose before patching again**: instrument coverage/provider response shape on a tightly bounded run, identify the actual upstream failure mode, then change the algorithm only if the evidence supports it.

See [`docs/EVALUATION.md`](docs/EVALUATION.md) and [`docs/FAILURE_TAXONOMY.md`](docs/FAILURE_TAXONOMY.md).

## Key implementation components

- `api/package-analyze.js` / `api/package-analysis.js` — package HTTP entrypoints
- `server/lib/azureDocumentIntelligence.js` — Azure provider integration
- `server/lib/pdfBatchAnalysis.js` — F0-aware page splitting/recombination/page rebasing
- `server/lib/normalizeMortgagePackage.js` — package segmentation/context normalization
- `server/lib/documentSpecificQc.js` — document-specific evidence extraction
- `server/lib/documentIntelligenceDiagnostics.js` — OCR/provider health diagnostics
- `server/lib/azureTextLayout.js` — Azure text-layout normalization/fallback behavior
- `server/fixtures/pdfEvaluationFixtures.js` — controlled digital baseline fixtures
- `server/fixtures/pdfStressFixtures.js` — controlled digital stress fixtures
- `server/fixtures/pdfRasterStressFixtures.js` — image-only raster fixtures
- `src/domain/packageQcCase.js` — deterministic package/document QC case generation
- `src/domain/mortgageQc.js` — recommendation, blocker, override, and audit semantics
- `src/domain/humanCorrection.js` — bounded human correction + deterministic re-evaluation
- `src/HumanCorrectionDemo.jsx` — reviewer correction UX
- `src/PdfEvidenceViewer.jsx` — source-page evidence review
- `src/EvaluationPipelineHealth.jsx` — layered AI-system health view

## Safety and decision semantics

- Any unresolved **Fail** creates an exception recommendation unless a valid authorized exception is recorded.
- Funding-critical **Needs Review** blocks a ready disposition.
- A correction updates extracted evidence and reruns the configured control; it is not an override.
- Overrides require an authorized actor, structured reason, and source evidence.
- Configured critical rules may require second approval.
- A confidently absent document becomes an exception only when the pinned fictional profile/channel explicitly configures that document as required.
- Unknown/low-confidence inventory routes to `Needs Review` instead of inventing certainty.
- Signature/notary indicators assist evidence location; they do not constitute legal validation.
- Provider/model confidence is never treated as business-decision confidence.

## UX principles

Assay treats UX as part of product correctness:

- **exception first** — focus the analyst on what needs action
- **evidence beside action** — avoid forcing source hunting
- **correction ≠ override** — different intent, language, and behavior
- **show consequences** — expose before/after rule and recommendation changes
- **preserve context** — keep the reviewer anchored to the finding after re-evaluation
- **progressive disclosure** — technical confidence/provenance is available but secondary
- **safe defaults** — uncertainty remains reviewable rather than becoming an implicit pass
- **consistent language** — the same status/action vocabulary across QC, Human Review, Evaluation, and Live Analysis

## Current prototype boundaries

- first 8 pages / 4 MB per package
- heuristic normalization over Azure layout output rather than a production-trained mortgage classifier/schema suite
- fictional sample profiles/rules only
- browser-session live case/PDF retention
- no production identity, tenancy, durable audit store, or enterprise retention model
- small synthetic benchmark sets
- true raster performance currently demonstrates a known upstream failure mode, not production readiness
- cost telemetry is not instrumented

## Current roadmap

1. **Integrate the reusable correction interaction into QC finding cards** while preserving the same exception-first UX.
2. Extend correction to bounded live fields only where evidence/reference semantics are explicit.
3. Add lightweight pipeline observability to measured runs: pages/calls/coverage/confidence/latency/review triggers.
4. Diagnose the raster failure with coverage telemetry before another OCR/normalization change.
5. Evaluate a selective model/LLM experiment only where probabilistic understanding has a clear bounded advantage over heuristics; deterministic controls remain the decision layer.
6. Continue recruiter-facing polish only after product behavior is coherent and measured.

## Free-tier constraint

The portfolio must remain **$0**. Azure stays on F0; Vercel stays on Hobby/free; shared helpers remain outside `api/` so the project keeps its four-function footprint. If a free allowance/limit is reached, work stops or defers rather than upgrading to a paid tier.

## Technology

React 18 · Vite · Vercel Functions · Azure AI Document Intelligence (`prebuilt-layout`, API `2024-11-30`) · PDF.js · `pdf-lib` · Node.js test runner.

Every Vercel build runs:

```bash
npm test && vite build
```

## Data and IP notice

Use synthetic/sample documents only. Do not upload real borrower, mortgage, identity, financial, or other sensitive customer information.

Assay is independently designed using original workflows, synthetic data, and fictional policy profiles. It does not contain or represent employer, client, vendor, or third-party confidential implementation, rule set, data, or process.

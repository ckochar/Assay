# Assay

Assay is an **AI-assisted post-execution mortgage document QC product** that turns an executed PDF package into evidence-backed review findings and a human-accountable disposition.

**Live product:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Reliability evaluation:** https://assay-navy.vercel.app/evaluation

> Assay is an independent portfolio prototype built with synthetic/sample data. It is not legal, lending, compliance, notarization, or underwriting software and should not be used with real customer or borrower information.

## What problem Assay addresses

Post-execution mortgage QC often requires an analyst to move page by page through an executed package, determine what documents are present, locate relevant execution evidence, compare information across documents, identify exceptions, and record a defensible disposition.

Assay is designed as the **downstream QC layer** after document execution. A package may arrive from a remote-online-notarization flow, a mobile-notary flow, or directly to a QC team; Assay's job is to understand the resulting package and help an analyst review it consistently.

## Product thesis

**AI extracts evidence. Deterministic controls evaluate it. Humans remain accountable.**

Assay is built around six principles:

1. **Evidence first** — findings should point back to source document, page, excerpt, and available page geometry.
2. **Deterministic decisioning** — OCR/document AI supplies evidence; transparent code evaluates business controls.
3. **Fail-safe routing** — missing, conflicting, low-confidence, or legally meaningful evidence routes to human review instead of silently becoming a ready decision.
4. **Version traceability** — evaluations pin the rule profile and extractor context used at review time.
5. **Human accountability** — authorized reviewers record corrections, overrides, returns, and final dispositions.
6. **Measured reliability** — release decisions use labeled evaluation cases, with **zero false-ready packages** as the primary safety gate.

## What is live today

### 1. Package Intelligence

`/package` accepts a synthetic/sample combined mortgage PDF and runs the first **8 pages** through Azure AI Document Intelligence using `prebuilt-layout`.

The current prototype:

- validates PDF type and decoded payload size (up to 4 MB)
- sends the package to Azure for OCR/layout analysis
- classifies pages into mortgage document types
- groups consecutive pages into document segments
- builds a package inventory
- extracts loan number, borrower, jurisdiction, OCR-quality, and page-linked evidence
- resolves a candidate TX/CA/FL sample rule profile when package context supports it
- leaves unknown, low-confidence, or unresolved context explicit for human review

Representative document types include:

- Promissory Note
- Mortgage or Deed of Trust
- Closing Disclosure
- Notice of Right to Cancel
- Occupancy Affidavit
- Signature/Name Affidavit
- Notary Acknowledgment

### 2. Document-specific QC

Assay currently derives evidence-backed signals and deterministic review controls for areas such as:

- Promissory Note execution date
- borrower signature **text/location indicators**
- Closing Disclosure closing date
- Note / Closing Disclosure date consistency
- Right-to-Cancel title and cancellation-language indicators
- Right-to-Cancel transaction/deadline chronology
- notary venue and acknowledgment indicators
- notary acknowledgment and commission-expiration chronology
- cross-document borrower-name consistency
- package classification, loan identity, profile context, and OCR quality

Signature or notary **legal validity is never inferred from OCR text alone**. Execution evidence that requires visual or legal judgment remains a human-review item.

### 3. Evidence-backed reviewer workspace

Live package analysis can create a `QC-PKG-*` case and continue into the same reviewer experience used by the preloaded scenarios.

The workspace supports:

- Pass / Fail / Needs Review findings
- source-document and page evidence
- PDF.js source viewer
- page-linked Azure evidence polygons where available
- funding blockers for unresolved critical findings
- return-for-correction actions
- structured overrides with authorization, reason, and evidence requirements
- optional second approval for configured critical rules
- final disposition
- audit history
- pinned evaluation/extractor/profile context

### 4. Sample scenarios

The QC Dashboard includes three preloaded mortgage scenarios that demonstrate:

- a clean review path
- a deterministic exception
- a low-confidence / human-review path

These are sample-data experiences and are separate from the live Azure package-analysis path.

## Reliability evaluation

Assay includes a visible `/evaluation` screen and a build-gated labeled **decision-layer golden set**.

Current production baseline:

- **10 / 10** expected recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions
- **30 / 30** automated tests passing in the production build

The build fails if the current zero-false-ready decision-layer release gate regresses.

This benchmark intentionally measures **deterministic decision behavior over labeled structured evidence**. It does **not yet measure** Azure OCR accuracy, document-classification accuracy, field-extraction accuracy, evidence-localization accuracy, latency, or processing cost on unseen PDFs. See [`docs/EVALUATION.md`](docs/EVALUATION.md).

## Architecture

```text
Sample / synthetic PDF
        |
        v
Vercel package-analysis API
        |
        v
Azure AI Document Intelligence
OCR + layout + page geometry
        |
        v
Assay normalization
package segmentation + context + document-specific evidence
        |
        v
Deterministic QC controls
versioned profile context + fail-safe routing
        |
        v
Human reviewer
PDF evidence -> correct / return / override / disposition
        |
        v
Audit + evaluation context
```

### Key implementation components

- `api/package-analyze.js` / `api/package-analysis.js` — asynchronous live package processing
- `api/lib/azureDocumentIntelligence.js` — Azure provider integration
- `api/lib/normalizeMortgagePackage.js` — package segmentation and context normalization
- `api/lib/documentSpecificQc.js` — document-specific evidence extraction
- `src/domain/packageQcCase.js` — deterministic package and document-specific QC case generation
- `src/PdfEvidenceViewer.jsx` — source-page evidence review
- `src/domain/mortgageQc.js` — core recommendation, blocker, override, and audit semantics
- `src/domain/goldenEvaluation.js` — decision-layer evaluation runner

## Safety and decision semantics

The current product enforces these principles:

- any unresolved **Fail** creates an exception recommendation unless a valid authorized exception is recorded
- funding-critical **Needs Review** findings block a ready disposition
- overrides require an authorized actor, structured reason, and source evidence
- configured critical rules may require second approval
- a recommendation is not silently converted into a funding-ready disposition
- unknown or low-confidence package context stays visible rather than receiving an invented document type or rule profile
- signature and notary indicators assist evidence location; they do not constitute legal validation

## Confidence model

Assay avoids one generic "AI confidence" score for the business decision. The data model separates signals such as:

- document-classification confidence
- extraction confidence
- OCR quality
- evidence completeness
- review trigger
- deterministic rule result

Confidence is a **routing input**. Deterministic controls produce the recommendation.

## Current prototype boundaries

Assay is deliberately narrow and transparent about what is not production-ready:

- package analysis is limited to the first 8 pages and 4 MB PDFs
- current document classification and extraction use heuristic normalization over Azure layout output rather than a production-trained mortgage classifier/schema suite
- candidate TX/CA/FL profiles and mortgage rules are fictional portfolio data, not legal requirements
- live case/PDF retention is browser-session based rather than durable workflow storage
- rate limiting is process-local and best-effort, not a distributed production control
- there is no production identity, tenancy, customer-data governance, or enterprise retention model
- the current golden set is a decision-layer benchmark, not an end-to-end OCR benchmark

## Next milestone: PDF-level evaluation

The next phase is a labeled synthetic PDF benchmark run through the **actual Azure pipeline**. It will measure extraction quality separately from decision quality, including:

- page/document classification accuracy
- field extraction precision / recall / F1
- evidence page and region localization
- false-ready and false-exception behavior after extraction
- review-routing behavior
- P50 / P95 processing latency
- Azure processing cost per package

The current decision-layer benchmark will remain separate so OCR errors and rule-engine errors are diagnosable rather than blended into one score.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for completed work and the forward roadmap.

## Technology

Current production prototype:

- React 18
- Vite
- Vercel Functions
- Azure AI Document Intelligence (`prebuilt-layout`, API `2024-11-30`)
- PDF.js
- `pdf-lib` for generated sample PDFs
- Node.js built-in test runner

Every Vercel build runs:

```bash
npm test && vite build
```

A failing automated test blocks deployment.

## Local setup

```bash
npm install
npm run dev
```

For live Azure analysis, configure the server-side environment variables documented in `.env.example`. Do not commit credentials.

## Competitive position

Assay does not attempt to reproduce an entire eClosing, LOS, notarization, or mortgage operations suite. The product focuses on a narrower post-execution QC problem and differentiates through:

- transparent deterministic controls
- versioned policy/profile context
- page-level evidence provenance
- explicit human-review routing
- auditability and override controls
- visible reliability evaluation
- separation of extraction quality from decision quality

## Data and IP notice

Use synthetic/sample documents only. Do not upload real borrower, mortgage, identity, financial, or other sensitive customer information.

Assay is an independently designed portfolio project using original workflows, synthetic data, and fictional policy profiles. It does not contain or represent any employer, client, vendor, or third-party confidential implementation, rule set, data, or process.

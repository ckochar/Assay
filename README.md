# Assay

Assay is an **AI-assisted post-execution mortgage document QC product** that turns an executed PDF package into evidence-backed review findings and a human-accountable disposition.

**Live product:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Reliability evaluation:** https://assay-navy.vercel.app/evaluation

> Assay is an independent portfolio prototype built with synthetic/sample data. It is not legal, lending, compliance, notarization, or underwriting software and should not be used with real customer or borrower information.

## Product thesis

**AI extracts evidence. Deterministic controls evaluate it. Humans remain accountable.**

Post-execution mortgage QC often requires an analyst to move page by page through an executed package, determine what documents are present, locate execution evidence, compare information across documents, identify exceptions, and record a defensible disposition. Assay is designed as the downstream QC layer after document execution.

The product is built around six principles:

1. **Evidence first** — findings point back to source document, page, excerpt, and available geometry.
2. **Deterministic decisioning** — OCR/document AI supplies evidence; transparent code evaluates business controls.
3. **Fail-safe routing** — missing, conflicting, low-confidence, or legally meaningful evidence routes to human review instead of silently becoming ready.
4. **Version traceability** — evaluations pin rule-profile and extractor context.
5. **Human accountability** — authorized reviewers record corrections, overrides, returns, and final dispositions.
6. **Measured reliability** — decision and document-intelligence quality are evaluated separately, with **zero false-ready packages** as the primary safety gate.

## What is live today

### Package Intelligence

`/package` accepts a synthetic/sample combined mortgage PDF and analyzes the first **8 pages** with Azure AI Document Intelligence `prebuilt-layout`.

The current pipeline:

- validates PDF type and decoded payload size up to 4 MB
- splits package pages into provider-sized Azure requests when required
- runs OCR/layout analysis and restores original package page numbers after recombination
- classifies pages into mortgage document types
- groups consecutive pages into document segments
- builds a package inventory
- extracts loan number, borrower, jurisdiction, OCR-quality, and page-linked evidence
- resolves a candidate TX/CA/FL sample rule profile only when supported by package context
- compares the classified inventory with **fictional profile-configured required document types** for the QC-only sample flow
- leaves unknown, low-confidence, or unresolved context explicit for human review

Representative document types:

- Promissory Note
- Mortgage or Deed of Trust
- Closing Disclosure
- Notice of Right to Cancel
- Occupancy Affidavit
- Signature/Name Affidavit
- Notary Acknowledgment

### Document-specific QC

Assay derives evidence-backed signals and deterministic controls for areas such as:

- Promissory Note execution date
- borrower signature **text/location indicators**
- Closing Disclosure closing date
- Note / Closing Disclosure date consistency
- Right-to-Cancel title, cancellation language, and date chronology
- notary venue, acknowledgment, and commission-expiration chronology
- cross-document borrower-name consistency
- package classification, loan identity, profile context, OCR quality, and profile-configured document inventory

Signature or notary **legal validity is never inferred from OCR text alone**. Execution evidence requiring visual or legal judgment remains a human-review item. The sample document requirements are fictional portfolio configuration, not legal, investor, or lender guidance.

### Evidence-backed reviewer

Live package analysis can create a `QC-PKG-*` case and continue into the same reviewer workspace used by the preloaded scenarios.

The workspace supports Pass / Fail / Needs Review findings, source-page evidence, a PDF.js viewer, Azure evidence polygons where available, funding blockers, return-for-correction, structured overrides, optional second approval, final disposition, audit history, and pinned evaluation context.

## Reliability evaluation

Assay now exposes three deliberately separate reliability slices on `/evaluation`.

### 1. Decision-layer golden set

This benchmark starts from labeled structured evidence and isolates deterministic QC/recommendation behavior.

Current result:

- **10 / 10** recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions

### 2. Initial PDF / Azure baseline

Five version-controlled synthetic **digital-text** mortgage PDFs, eight pages each, were run through the actual Azure → Assay extraction → evidence → QC path.

Measured result across **40 pages**:

- **40 / 40** expected page classifications
- **50 / 50** labeled field values
- **44 / 44** expected evidence source pages with evidence present
- **5 / 5** package recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions
- **P50 latency: 12.36 s**
- **P95 latency: 12.71 s**

These 100% values are an **initial controlled baseline, not a production accuracy claim**. The fixtures are clean generated digital PDFs; they do not establish performance on scans, handwriting, blur, severe skew, poor raster quality, or broad unseen lender layouts. Processing cost was not instrumented, so Assay does not publish a fabricated cost-per-package number.

### 3. Digital PDF stress set v1

Three additional eight-page synthetic PDFs tested **mixed page rotation metadata**, **smaller/lighter compact two-column text**, and a **duplicated Closing Disclosure with the configured Notary Acknowledgment absent**.

Final measured result across **24 benchmark pages**:

- **24 / 24** expected page classifications
- **30 / 30** labeled field values
- **25 / 25** expected evidence source pages with evidence present
- **3 / 3** package recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions
- **P50 latency: 12.36 s**
- **P95 latency: 12.52 s**

The stress set produced a useful product change. In the first structural run, Azure correctly showed that the Notary document and its fields were absent, but Assay had no profile-driven rule that converted a confidently incomplete package inventory into an exception. Assay added `PKG-DOC-REQ-001`, versioned the fictional QC-only TX profile to **2.2.0**, and re-ran that case. The final published run correctly returned **Exception Identified** with `Missing: Notary Acknowledgment` while preserving zero false-ready behavior.

This is still a **digital-document stress benchmark, not a scanned-image benchmark**. Rotation and typography/layout variation do not establish performance on rasterized low-DPI scans, blur, noise, scan compression, handwriting, or broad unseen form families.

See [`docs/EVALUATION.md`](docs/EVALUATION.md) for scenario definitions, metric methodology, limitations, and the next reliability steps.

## Azure F0 package batching

The first end-to-end PDF benchmark exposed a provider constraint: the configured Azure F0 resource analyzes only a small number of PDF pages per provider request. Assay keeps the **8-page product experience** by using a provider-aware batching layer rather than silently dropping later pages.

```text
8-page package
   |
   +--> pages 1-2 -> Azure
   +--> pages 3-4 -> Azure
   +--> pages 5-6 -> Azure
   +--> pages 7-8 -> Azure
                    |
                    v
       rebase to original page numbers
                    |
                    v
        one combined Assay package result
```

The portfolio configuration stays on the Azure **F0** tier and uses sequential two-page chunks with configurable throttling. If a free-tier provider limit is reached, the portfolio workflow should stop/defer rather than depend on a paid upgrade.

## Architecture

```text
Synthetic/sample PDF
        |
        v
Vercel package API
validation + provider-aware PDF batching
        |
        v
Azure AI Document Intelligence
OCR + layout + page geometry
        |
        v
Assay batch recombination
restore original package page numbers
        |
        v
Normalization + document-specific extraction
package context + source evidence
        |
        v
Deterministic QC controls
versioned profile context + required inventory + fail-safe routing
        |
        v
Human reviewer
PDF evidence -> correct / return / override / disposition
        |
        v
Audit + evaluation context
```

### Key implementation components

- `api/package-analyze.js` / `api/package-analysis.js` — asynchronous package processing
- `api/lib/azureDocumentIntelligence.js` — Azure provider integration
- `api/lib/pdfBatchAnalysis.js` — provider-aware page splitting, throttling, recombination, and page rebasing
- `api/lib/normalizeMortgagePackage.js` — package segmentation and context normalization
- `api/lib/documentSpecificQc.js` — document-specific evidence extraction
- `api/lib/pdfStressFixtures.js` — reproducible digital stress fixtures
- `src/domain/packageQcCase.js` — deterministic package/document QC case generation, including profile-driven inventory checks
- `src/PdfEvidenceViewer.jsx` — source-page evidence review
- `src/domain/mortgageQc.js` — recommendation, blocker, override, and audit semantics
- `src/domain/goldenEvaluation.js` — decision-layer evaluator
- `src/domain/pdfEvaluation.js` — PDF classification/extraction/evidence/recommendation evaluator
- `src/data/pdfEvaluationBaseline.js` — recorded initial PDF/Azure baseline
- `src/data/pdfStressBaseline.js` — recorded digital PDF stress baseline

## Safety and decision semantics

- Any unresolved **Fail** creates an exception recommendation unless a valid authorized exception is recorded.
- Funding-critical **Needs Review** findings block a ready disposition.
- Overrides require an authorized actor, structured reason, and source evidence.
- Configured critical rules may require second approval.
- A confidently absent document becomes an exception **only when the pinned fictional profile and intake channel explicitly configure that document as required**.
- If unknown or low-confidence pages could contain a configured required document, inventory completeness routes to **Needs Review** instead of a deterministic missing-document failure.
- Unresolved profiles do not receive invented required-document assumptions.
- Signature and notary indicators assist evidence location; they do not constitute legal validation.
- Evidence evaluation does not award provenance credit to a manufactured page number without meaningful source evidence.

## Confidence model

Assay does not use one generic “AI confidence” score for a business decision. The data model separates document-classification confidence, extraction confidence, OCR quality, evidence completeness, review triggers, and deterministic rule results.

Confidence is a **routing input**. Deterministic controls produce the recommendation.

## Current prototype boundaries

Assay is deliberately narrow and transparent about what is not production-ready:

- package analysis is limited to the first 8 pages and 4 MB PDFs
- document classification/extraction use heuristic normalization over Azure layout output rather than a production-trained mortgage classifier/schema suite
- candidate TX/CA/FL profiles, required-document inventories, and mortgage rules are fictional portfolio data, not legal requirements
- only the fictional **QC-only** sample profiles currently configure required-document inventories; RON/mobile-notary requirements are not implemented
- live case/PDF retention is browser-session based rather than durable workflow storage
- application rate limiting is process-local and provider F0 throttling can still affect burst latency
- there is no production identity, tenancy, customer-data governance, or enterprise retention model
- the clean PDF benchmark is five controlled digital fixtures and stress v1 is three controlled digital fixtures; neither is a generalization estimate
- true raster/scan degradation remains unmeasured
- cost telemetry is not yet captured

## Next evaluation milestone

The next benchmark should move from digital-PDF manipulation to **true raster / scan stress**, while staying within free-tier limits:

- rasterized low-resolution pages
- controlled blur and image noise
- image-level skew and rotation
- scan compression artifacts and poor contrast
- varied/unseen document layouts
- ambiguous borrower/name/date evidence
- missing/duplicated pages under classification uncertainty
- repeated runs only when useful to separate provider throttling from normal latency
- cost instrumentation only if it can be implemented without creating billable usage

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for delivered status and the forward roadmap.

## Technology

- React 18
- Vite
- Vercel Functions
- Azure AI Document Intelligence (`prebuilt-layout`, API `2024-11-30`)
- PDF.js
- `pdf-lib`
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

For live Azure analysis, configure the server-side environment variables in `.env.example`. Never commit credentials.

## Data and IP notice

Use synthetic/sample documents only. Do not upload real borrower, mortgage, identity, financial, or other sensitive customer information.

Assay is an independently designed portfolio project using original workflows, synthetic data, and fictional policy profiles. It does not contain or represent any employer, client, vendor, or third-party confidential implementation, rule set, data, or process.

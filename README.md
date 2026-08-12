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
- package classification, loan identity, profile context, and OCR quality

Signature or notary **legal validity is never inferred from OCR text alone**. Execution evidence requiring visual or legal judgment remains a human-review item.

### Evidence-backed reviewer

Live package analysis can create a `QC-PKG-*` case and continue into the same reviewer workspace used by the preloaded scenarios.

The workspace supports Pass / Fail / Needs Review findings, source-page evidence, a PDF.js viewer, Azure evidence polygons where available, funding blockers, return-for-correction, structured overrides, optional second approval, final disposition, audit history, and pinned evaluation context.

## Reliability evaluation

Assay exposes two deliberately separate benchmarks on `/evaluation`.

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

These 100% values are an **initial controlled baseline, not a production accuracy claim**. The fixtures are clean generated digital PDFs; they do not establish performance on scans, handwriting, blur, skew, poor contrast, or broad unseen lender layouts. Processing cost was not instrumented, so Assay does not publish a fabricated cost-per-package number.

See [`docs/EVALUATION.md`](docs/EVALUATION.md) for scenario definitions, metric methodology, limitations, and next stress-set plans.

## Azure F0 package batching

The first end-to-end PDF benchmark exposed a provider constraint: the configured Azure F0 resource analyzes only a small number of PDF pages per provider request. Assay now keeps the **8-page product experience** by using a provider-aware batching layer rather than silently dropping later pages.

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

The defaults use sequential two-page chunks with configurable throttling. Server-only overrides are documented in `.env.example` so a higher Azure tier can increase pages per request without changing the product contract.

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

- `api/package-analyze.js` / `api/package-analysis.js` — asynchronous package processing
- `api/lib/azureDocumentIntelligence.js` — Azure provider integration
- `api/lib/pdfBatchAnalysis.js` — provider-aware page splitting, throttling, recombination, and page rebasing
- `api/lib/normalizeMortgagePackage.js` — package segmentation and context normalization
- `api/lib/documentSpecificQc.js` — document-specific evidence extraction
- `src/domain/packageQcCase.js` — deterministic package/document QC case generation
- `src/PdfEvidenceViewer.jsx` — source-page evidence review
- `src/domain/mortgageQc.js` — recommendation, blocker, override, and audit semantics
- `src/domain/goldenEvaluation.js` — decision-layer evaluator
- `src/domain/pdfEvaluation.js` — PDF classification/extraction/evidence/recommendation evaluator
- `src/data/pdfEvaluationBaseline.js` — recorded initial PDF/Azure baseline

## Safety and decision semantics

- Any unresolved **Fail** creates an exception recommendation unless a valid authorized exception is recorded.
- Funding-critical **Needs Review** findings block a ready disposition.
- Overrides require an authorized actor, structured reason, and source evidence.
- Configured critical rules may require second approval.
- Unknown or low-confidence package context remains explicit instead of receiving an invented document type or rule profile.
- Signature and notary indicators assist evidence location; they do not constitute legal validation.
- Evidence evaluation does not award provenance credit to a manufactured page number without meaningful source evidence.

## Confidence model

Assay does not use one generic “AI confidence” score for a business decision. The data model separates document-classification confidence, extraction confidence, OCR quality, evidence completeness, review triggers, and deterministic rule results.

Confidence is a **routing input**. Deterministic controls produce the recommendation.

## Current prototype boundaries

Assay is deliberately narrow and transparent about what is not production-ready:

- package analysis is limited to the first 8 pages and 4 MB PDFs
- document classification/extraction use heuristic normalization over Azure layout output rather than a production-trained mortgage classifier/schema suite
- candidate TX/CA/FL profiles and mortgage rules are fictional portfolio data, not legal requirements
- live case/PDF retention is browser-session based rather than durable workflow storage
- application rate limiting is process-local and provider F0 throttling can still affect burst latency
- there is no production identity, tenancy, customer-data governance, or enterprise retention model
- the PDF benchmark is five controlled digital fixtures, not a generalization estimate
- cost telemetry is not yet captured

## Next evaluation milestone

The next benchmark should make the input harder rather than adding more clean PDFs:

- rasterized scans
- controlled blur and lower resolution
- rotated/skewed pages
- poor contrast and compression artifacts
- varied/unseen document layouts
- ambiguous borrower/name/date evidence
- duplicated and missing pages
- broader jurisdiction/profile context
- repeated runs to characterize provider throttling separately from normal latency
- processing-cost instrumentation before publishing cost metrics

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

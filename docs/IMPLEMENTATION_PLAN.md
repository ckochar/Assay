# Assay recruiter-ready implementation plan

## Product goal

Build a credible, working demonstration of an AI-assisted post-execution mortgage document QC product. The demo must show a real document moving through ingestion, OCR, classification, extraction, deterministic rules, page-level evidence, human review, and measured evaluation.

The product is inspired by the exception-oriented funding and post-close QC experience offered by established mortgage platforms, but it is not intended to be a replica. Assay's differentiators are transparent rule execution, versioned policy profiles, evidence provenance, explicit human accountability, and visible AI evaluation.

## Primary users

### QC analyst

Reviews exceptions and uncertain evidence, corrects extraction or classification errors, records an accountable disposition, and returns or escalates packages.

### QC manager

Manages queues, service levels, defect trends, analyst workload, and override patterns.

### Policy administrator

Authors, tests, approves, versions, publishes, and retires policy profiles and reusable rule templates.

### Governance or audit user

Examines model versions, rule versions, evidence, human actions, evaluation results, exceptions, and performance trends.

## Initial workflow

### Intake channels

- Remote online notarization
- Mobile notary
- QC-only intake

These channels affect metadata and operational routing. Assay remains downstream of document execution and notarization.

### Synthetic mortgage package

- Promissory Note
- Mortgage or Deed of Trust
- Closing Disclosure
- Notice of Right to Cancel
- Occupancy Affidavit
- Signature/Name Affidavit
- Notary Acknowledgment

### Demo scenarios

1. **Clean package:** all funding-critical evidence is present and high quality.
2. **Deterministic failure:** a required signature, document, or valid date sequence is missing.
3. **Needs review:** the expected evidence may be present, but OCR or extraction quality is insufficient for automated acceptance.

## P0 experience

### 1. Upload and processing

- Upload one or more synthetic PDFs.
- Validate type, size, page count, encryption, and corruption.
- Calculate a document hash.
- Display processing stages and recoverable failures.
- Clearly label live, preloaded, and simulated analysis.

### 2. Document intelligence

- OCR and layout extraction.
- Page-level document classification.
- Structured extraction using schemas.
- Signature, initial, checkbox, date, name, and notary-field detection.
- Bounding regions for every extracted fact.
- Independent classification confidence, extraction confidence, and OCR quality.

### 3. Deterministic rules

- Required-document completeness.
- Borrower-name consistency.
- Required signatures and initials.
- Required execution dates.
- Date-sequence validation.
- Notarial-field presence.
- Commission-expiration validation.
- Conditional witness requirements.

Rules consume normalized facts. They do not call a language model and do not use a generic model confidence as the business result.

### 4. Evidence-first reviewer

Use a split workspace:

- PDF viewer and thumbnails on the left.
- Findings and actions on the right.
- Selecting a finding navigates to and highlights its source region.
- The analyst can correct a field, change a classification, add alternate evidence, override, return, or escalate.

### 5. Funding control

- Any unresolved Fail blocks Ready for Funding unless an authorized exception exists.
- Funding-critical Needs Review findings block Ready for Funding.
- Override permission, structured reason, page evidence, and optional second approval are enforced.
- The final action records the recommendation currently supported by the findings.

### 6. Version trace

Each evaluation stores:

- input document hash
- OCR provider and version
- extraction provider/model and version
- schema version
- rule-profile ID and version
- individual rule versions
- evaluation timestamp
- reviewer and final disposition

Published profile changes create a new version. Completed reviews do not silently recompute.

### 7. Evaluation

Create a golden set of 20–30 synthetic packages with labels at package, document, field, evidence, and rule levels.

Primary release gate:

- zero false-ready packages

Secondary metrics:

- document classification precision and recall
- field extraction precision, recall, and F1
- evidence-location accuracy
- false-exception rate
- review-routing precision
- automation rate
- unable-to-process rate
- P50 and P95 latency
- cost per package

## Technical design

```text
Web client
  -> upload API
  -> file validation and hashing
  -> temporary object storage
  -> OCR/layout provider adapter
  -> document classifier
  -> schema-based extractor
  -> normalization layer
  -> deterministic rules engine
  -> evidence/provenance builder
  -> review task and audit store
```

### Azure first, provider-neutral architecture

Azure AI Document Intelligence is the preferred first experiment because it fits the learning goal and provides OCR, layout, custom classification, structured extraction, confidence signals, and bounding regions. Keep it behind a provider interface so another OCR or document-AI vendor can be evaluated later.

Suggested interface:

```ts
interface DocumentIntelligenceProvider {
  analyze(input: DocumentInput): Promise<LayoutResult>;
  classify(input: LayoutResult): Promise<ClassificationResult>;
  extract(input: LayoutResult, schema: ExtractionSchema): Promise<ExtractionResult>;
}
```

### Recommended portfolio stack

- React or Next.js frontend
- Vercel Functions or a small API service
- Azure AI Document Intelligence
- Structured LLM output only for ambiguous semantic extraction
- PDF.js reviewer
- Postgres for metadata, findings, rules, and audit events
- Blob storage with short retention for synthetic PDFs
- Zod or JSON Schema for extraction contracts
- Node test runner for deterministic domain logic
- Playwright for the recruiter demo flow

## Delivery sequence

### Sprint 0: product correctness

- Finalize mortgage workflow and language.
- Fix funding-blocking semantics.
- Separate confidence signals.
- Add profile and extractor version context.
- Refactor rule logic out of the UI.
- Add unit tests for safety-critical decisions.

### Sprint 1: real PDF path

- Add upload API and temporary storage.
- Integrate Azure OCR/layout.
- Create the document classifier and extraction schemas.
- Process one clean synthetic package end to end.

### Sprint 2: evidence and review

- Add PDF.js viewer.
- Map extracted facts to page coordinates.
- Add field correction and classification correction.
- Add deterministic-failure and low-confidence packages.

### Sprint 3: evaluation and governance

- Build golden-set runner.
- Add false-ready and false-exception reporting.
- Add model/profile version comparisons.
- Add latency and cost telemetry.

### Sprint 4: recruiter presentation

- Add guided walkthrough.
- Add architecture and trade-off pages.
- Add resettable demo data.
- Add screenshots or a short product GIF to the README.
- Run accessibility, responsive, failure-state, and end-to-end checks.

## Explicit non-goals for the portfolio version

- Building an OCR foundation model
- Reproducing an entire enterprise LOS or eClosing suite
- Real borrower or customer data
- Real legal interpretations of state notary law
- Production claims of regulatory compliance
- Full enterprise identity, tenancy, and vendor management

These should be described as production requirements or architectural considerations, not falsely represented as implemented capabilities.

## Recruiter demo sequence

1. Explain the manual post-execution QC problem and product boundary.
2. Upload a synthetic mortgage package.
3. Show real classification and extraction.
4. Open a finding and navigate to highlighted page evidence.
5. Correct, override, return, or escalate with an audit event.
6. Show the pinned model and rule-profile versions.
7. Show golden-set performance and the zero-false-ready release gate.
8. Close with architecture, trade-offs, and next product bets.

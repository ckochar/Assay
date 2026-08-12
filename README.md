# Assay

Assay is an **AI-assisted post-execution document QC product for mortgage and regulated lending operations**. It ingests an executed document package, classifies its documents, extracts reviewable facts, evaluates those facts through deterministic policy rules, and routes exceptions or uncertain evidence to a human analyst.

**Live demo:** https://assay-navy.vercel.app

> Assay is not a notarization or remote-online-notarization platform. Products such as Proof, Snapdocs, and Pavaso help execute or notarize documents. Assay is the downstream QC layer that verifies the resulting package before funding or post-close completion, regardless of whether the package arrived through RON, mobile notary, or QC-only intake.

## Product thesis

**AI extracts; versioned policy rules decide; humans remain accountable.**

Assay is designed around six principles:

1. **No decision without evidence.** Every extracted fact and finding should point to its source document, page, and region.
2. **Deterministic decisioning.** OCR and language models classify and extract; deterministic rules determine policy outcomes.
3. **Fail-safe routing.** Missing, conflicting, or uncertain funding-critical evidence must never create an automated ready recommendation.
4. **Versioned policy.** Every evaluation is pinned to the rule profile and rule versions used at decision time.
5. **Human accountability.** The system recommends; an authorized person records the final disposition.
6. **Measured reliability.** Release decisions use a labeled evaluation set, with zero false-ready packages as the primary safety gate.

## Initial mortgage workflow

The initial recruiter demo will focus on a synthetic mortgage post-execution package containing representative documents such as:

- Promissory Note
- Mortgage or Deed of Trust
- Closing Disclosure
- Notice of Right to Cancel
- Occupancy Affidavit
- Signature/Name Affidavit
- Notary Acknowledgment

Illustrative controls include required-document completeness, borrower-name consistency, signatures and initials, execution dates, date sequencing, notarial fields, witness requirements, and commission-expiration validity.

All sample documents, jurisdictions, rules, and loan data are fictional and must not be used for legal, lending, or compliance decisions.

## Workflow boundaries

Assay supports the downstream QC stage for three representative intake channels:

- **RON:** executed packages produced by a remote-online-notarization provider
- **Mobile notary:** executed packages returned by a field or third-party notary
- **QC only:** executed packages received directly for document-quality review

The intake channel is metadata for workflow routing and analysis; it does not change the core product responsibility: determine whether the received document package contains sufficient evidence to support an analyst disposition.

## Current capabilities

**Phase 1.5** is an interactive React prototype with synthetic data. It currently includes:

- Operations dashboard and review queue
- New package-review workflow
- Ten deterministic QC controls
- Pass, Fail, Needs Review, and N/A findings
- Editable jurisdiction parameters
- Live rule recomputation
- Analyst override, return, escalation, and final-disposition actions
- Critical-finding safeguards
- Automated and human audit history
- AI-governance view with override monitoring
- Three seeded synthetic scenarios

The rules engine is real and computes findings from structured package data. PDF ingestion, OCR, document classification, and field extraction are currently simulated and are the next implementation milestone.

## Policy and decision controls

The target funding policy is:

- Any unresolved **Fail** blocks a ready-for-funding disposition unless an authorized policy exception is recorded.
- A **Needs Review** result blocks funding when the rule is configured as funding-critical.
- Overrides require an authorized role, a structured reason, supporting evidence, and optional second approval based on policy.
- The final action confirms the actual current recommendation; it does not always produce a ready disposition.
- Completed evaluations remain pinned to the profile and rule versions used at the time of review.

## Rules architecture

Assay uses reusable deterministic rule templates implemented in code. Policy parameters and rule profiles are stored as versioned data.

Examples:

- required-document template + document matrix parameters
- field-presence template + required-field parameters
- minimum-count template + witness parameters
- date-sequence template + permitted chronology parameters
- cross-document-match template + normalization parameters

A published profile has an ID, version, effective date, approval state, and test cases. Updating a profile creates a new version; it does not silently rewrite completed decisions.

## Confidence and routing

Assay does not treat one generic confidence score as a probability that a business decision is correct. The target data model separates:

- document-classification confidence
- OCR quality
- field-extraction confidence
- evidence completeness
- rule result
- review trigger

Confidence is a routing input. Deterministic rules produce the policy result.

## AI governance

Fannie Mae Lender Letter LL-2026-04 establishes governance expectations for mortgage AI/ML, including policies, risk management, ownership, annual review, information-security controls, and vendor governance. Assay illustrates product capabilities that could support such a governance program, including auditability, human accountability, version traceability, evaluation, and performance monitoring.

This prototype is an educational illustration, not an assertion of regulatory compliance.

## Next milestones

### P0 — recruiter-ready product

- Process at least one real synthetic PDF package end to end
- Add OCR, document classification, and schema-based extraction
- Add a split-screen PDF reviewer with click-to-evidence navigation
- Support clean, deterministic-failure, and low-confidence demo packages
- Build a 20–30 package golden evaluation set
- Publish false-ready, false-exception, automation, latency, and cost metrics
- Expose model, extractor, rule-profile, and document versions in the audit trace
- Clearly label live AI, preloaded sample, and simulated behavior
- Add a guided recruiter walkthrough

### P1 — operational depth

- Review queues, ownership, priority, and SLA
- Correction-request generation and resubmission comparison
- Rule-profile draft, approval, publish, rollback, and impact simulation
- Role-based permissions and second-level approval
- Batch intake, API output, and webhook notifications

## Evaluation release gate

The primary safety metric is:

> **Zero false-ready packages in the golden evaluation set.**

A false exception creates manual work. A false-ready result may create lending, customer, or compliance risk.

Secondary metrics include document-classification accuracy, field-extraction precision/recall, review-routing precision, automation rate, override rate, unable-to-process rate, P50/P95 latency, and processing cost per package.

## Technology direction

Current stack:

- React 18
- Vite
- Static Vercel deployment

Planned architecture:

- PDF upload and ephemeral object storage
- Azure AI Document Intelligence behind a provider interface for OCR/layout/classification experiments
- Structured LLM extraction where deterministic parsers are insufficient
- Independent deterministic rules service
- Versioned evaluation and audit storage
- PDF.js evidence viewer

Azure is a practical first provider because it offers document OCR, layout, custom classification, extraction, confidence values, and bounding regions. The provider will remain abstracted so the project can compare or replace vendors later.

## Competitive approach

Assay will not attempt to reproduce every feature of Snapdocs or another established platform. Snapdocs is the closest workflow benchmark for funding and post-close QC. Assay will learn from its exception-oriented review experience while differentiating through:

- transparent rule execution
- self-serve versioned policy profiles
- page-level evidence provenance
- visible model and rule evaluation
- explicit separation of AI extraction, policy decisions, and human dispositions

## Stack and data notice

This repository is currently a frontend portfolio prototype. It has no production authentication, customer-data controls, or legal rule content. Use synthetic documents only. Do not upload real personal, mortgage, financial, or identity information.

## IP note

Assay is an independently designed portfolio project using synthetic data, fictional policy profiles, and original workflows. It does not contain or represent any employer, client, or vendor product, implementation, data, rule set, or confidential process.
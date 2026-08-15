# Assay implementation status and roadmap

## Product goal

Assay is a working portfolio demonstration of an **AI-assisted post-execution mortgage document QC product**. It shows the operating loop from a synthetic executed PDF through document understanding, deterministic QC, evidence-backed human review, human correction, and measured reliability.

**Production:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Human Review:** https://assay-navy.vercel.app/human-review  
**Evaluation:** https://assay-navy.vercel.app/evaluation

Assay is intentionally narrow. It is not an LOS, eClosing platform, notarization platform, legal rules engine, or production mortgage system.

## Non-negotiable constraints

- Portfolio operation stays within **free service tiers / $0 spend**.
- Azure Document Intelligence remains F0.
- Vercel remains Hobby/free with the permanent four-function footprint.
- Synthetic/sample data only.
- Human corrections, overrides, and policy exceptions must remain distinguishable in both UX and audit semantics.
- UX is part of product correctness: evidence should be available beside the action, uncertainty should remain explicit, and common reviewer actions should minimize context switching.

## Current production baseline

Delivered:

- live Azure AI Document Intelligence integration
- combined-PDF analysis for the first 8 pages / 4 MB
- provider-aware Azure page batching and original-page recombination
- page classification, document segmentation, package inventory, and context extraction
- evidence-linked loan, borrower, jurisdiction, date, RTC, and notary signals
- deterministic package/document controls and profile-driven required-document inventory
- PDF.js source review + Azure page geometry where available
- reviewer blockers, return-for-correction, overrides, optional approval, final disposition, and audit history
- reusable bounded correction domain for borrower names, execution dates, and document classification
- focused `/human-review` correction experience
- **in-card correction inside eligible QC findings** with evidence, original AI value, corrected value, deterministic rerun, and audit preservation
- synthetic QC queue scenario `QC-24075` for borrower-extraction correction
- pinned extractor/profile context
- decision, clean-digital-PDF, digital-stress, and true-raster reliability work
- formal AI failure taxonomy and document-intelligence diagnostics
- zero-false-ready safety objective across published/recorded evaluation outcomes

## Primary users

### QC analyst
Needs to quickly answer: what is wrong, where is the source evidence, what can I safely correct, what requires an override/return, and what changed after my action?

### QC manager
Would manage queues, SLAs, defect trends, workload, and override/correction patterns. Durable multi-user operations remain outside the current portfolio scope.

### Policy administrator
Would author/test/version/publish profiles. The prototype demonstrates versioned profile concepts, not a production authoring workflow.

### Governance / audit user
Examines provider/model context, rule/profile versions, evidence provenance, human actions, exceptions, corrections, and measured reliability.

---

# Delivery status

## Sprint 0 — Product correctness

**Status: Completed for prototype baseline**

Delivered:

- post-execution QC boundary
- Fail / Needs Review funding-blocking semantics
- authorized exception behavior without erasing original findings
- structured override permission/reason/evidence/optional second approval
- pinned evaluation/profile/extractor context
- deterministic recommendation/safety domain functions
- safety-critical regression tests

## Sprint 1 — Live PDF path

**Status: Completed for current 8-page portfolio scope**

Delivered:

- sample PDF upload + decoded-size/%PDF validation
- Azure `prebuilt-layout`
- start/poll APIs
- provider-aware F0 batching/throttling/recombination
- page-level classification/segmentation
- package inventory and context extraction
- candidate fictional TX/CA/FL profile resolution

Remaining production-depth work:

- resilient provider retry/backoff
- production storage/processing records
- trained/schema-based mortgage classification/extraction
- larger package scope

## Sprint 2 — Evidence + human workflow

**Status: Major prototype scope completed; correction integrated into QC workflow**

Delivered:

- PDF.js reviewer + source-page evidence
- package-to-QC-case handoff
- document-specific date/signature/RTC/notary/cross-document controls
- return-for-correction, override, authorized exception, disposition, audit history
- profile-driven `PKG-DOC-REQ-001`
- fail-safe inventory routing
- evidence provenance fixes
- bounded correction domain that preserves the original AI value and reruns deterministic controls
- Human Review UX for three explicit correction types: borrower names, execution date, document classification
- reusable `FindingCard` with evidence-first correction UX
- correction controls shown only for explicitly correctable findings
- in-card correction without leaving the active QC case
- clear `Correct extracted value` vs `Override / exception` action distinction
- before/after rule and package recommendation feedback
- correction history with original AI value, human value, reviewer note, evidence context, rule status, and package recommendation
- queue-level synthetic correction case with regression coverage

Next human-workflow depth:

- extend correction to bounded live fields only when the live pipeline provides explicit reference/evidence semantics
- alternate-evidence selection
- corrected-document resubmission comparison
- durable audit/event persistence
- field-specific correction permissions

## Sprint 3 — Evaluation + governance

**Status: Layered evaluation baseline completed; raster diagnosis remains open**

### Decision layer

- 10/10 recommendation matches
- 0 false ready
- 0 false exceptions
- 0 missed deterministic exceptions

### Initial clean PDF / Azure baseline

Five generated digital eight-page packages / 40 pages:

- 40/40 classifications
- 50/50 labeled fields
- 44/44 evidence source pages with evidence present
- 5/5 recommendation matches
- 0 false ready
- P50 12.36 s / P95 12.71 s

### Digital stress v1

Three eight-page cases / 24 pages:

- 24/24 classifications
- 30/30 fields
- 25/25 evidence locations
- 3/3 recommendations
- 0 false ready
- P50 12.36 s / P95 12.52 s

The duplicated/missing-document scenario exposed a missing profile-driven inventory control and directly led to `PKG-DOC-REQ-001` plus regression coverage.

### True raster / image-only stress

Delivered:

- image-only PDFs with no text layer
- low-resolution raster scenario
- skew/blur/compression scenario
- post-fallback live Azure F0 reruns

Measured learning:

- both eight-page raster packages produced 0/8 usable classifications and 0/10 labeled fields downstream
- evidence recovery also collapsed
- provider average word confidence remained approximately 0.860 / 0.933
- both packages still routed safely to `Needs Review`
- 0 false ready

Product conclusion: **confidence is not coverage**. The next raster run must capture raw provider/OCR coverage and output-shape diagnostics before another algorithm change.

Delivered response:

- formal failure taxonomy
- word/line/text/page OCR diagnostics
- coverage ratios and confidence distribution support
- `/evaluation` redesigned around provider → OCR → understanding → evidence → decision → human accountability

Next reliability step:

1. instrument a tiny free-tier-safe raster run
2. inspect words/page, lines/page, text characters/page, pages with usable OCR, provider output shape
3. identify whether the limiting factor is rendering quality, OCR coverage, response normalization, or downstream heuristics
4. only then implement a targeted fix

## Sprint 4 — UX + portfolio communication

**Status: Active**

Delivered:

- public deployment
- Overview
- QC Dashboard
- Rule Profiles
- AI Governance
- layered Evaluation
- Human Review correction surface
- in-card evidence correction in the normal QC workflow
- correctable queue labeling so the analyst can recognize a bounded human-review case
- failure learning shown rather than hidden
- README/roadmap kept aligned with product behavior

UX principles used as release criteria:

- exception-first workflow
- evidence beside action
- minimum context switching
- clear correction vs override intent
- before/after consequence visibility
- progressive disclosure of technical detail
- safe defaults
- consistent terminology/action hierarchy

Remaining:

- browser-level end-to-end interaction test
- accessibility review
- responsive/mobile polish
- navigation/shell simplification where it reduces user confusion
- alternate-evidence UX
- optional short recruiter walkthrough/GIF after workflow stabilizes

---

# Decision architecture

Assay intentionally separates:

1. **Document intelligence** — OCR/layout/classification/extraction/page geometry.
2. **Normalization + deterministic controls** — transparent findings, blockers, recommendations.
3. **Human correction** — change extracted evidence and rerun the impacted control.
4. **Human override / policy exception** — separately authorized decision action when permitted.
5. **Final disposition** — accountable human confirmation.

A generic model confidence score is never the final business decision.

---

# Current priorities

## P0 — Reliability transparency

- keep `/evaluation` layered by pipeline stage
- preserve the raster failure as a visible learning case
- instrument before patching again
- maintain zero-false-ready as the primary safety gate

## P1 — Human-AI collaboration

Delivered baseline:

- reusable finding-review interaction
- eligible in-card corrections
- original AI value preserved
- deterministic rerun after correction
- rule + recommendation delta visible immediately
- audit trail records evidence/action/outcome

Next:

- connect bounded correction to real live package fields where reference/evidence semantics are explicit
- allow reviewer-selected alternate evidence without weakening provenance
- measure correction/review rate in evaluation datasets

## P1 — Lightweight observability

Capture without paid monitoring infrastructure:

- pages analyzed
- provider request/chunk count
- latency
- words/lines/text coverage
- OCR confidence distribution
- classification/extraction confidence
- evidence completeness
- human-review trigger
- controls evaluated
- final recommendation

## P2 — Selective model experiment

Only after the current pipeline is observable, compare a bounded probabilistic approach against the heuristic baseline where it adds genuine value. Candidate experiment: classification/structured extraction assistance. Deterministic controls remain the final decision layer.

## Defer

- database / durable enterprise workflow
- full RBAC/tenancy
- large policy authoring platform
- nationwide legal/regulatory rules
- generic chatbot/copilot
- LLM deciding whether a loan/package passes

---

# Release gates

- **0 false-ready packages** in labeled evaluation cases
- no correction action may silently behave like an override
- correction controls must appear only when field/evidence/reference semantics are explicitly configured
- no user-facing capability should require a paid tier for the portfolio
- no new serverless endpoints should violate the permanent free-tier function footprint
- documentation must be updated with material product behavior changes
- UX review is required for new analyst-facing actions: clear intent, evidence visibility, consequence visibility, and safe default behavior

## Recruiter demo sequence

1. Overview: downstream QC problem and product thesis.
2. QC Dashboard: exception-first work queue; open `QC-24075` to show a correctable extraction.
3. Correct the AI-extracted borrower value **inside the finding card** and show deterministic re-evaluation + audit delta.
4. Explain why correction differs from override/authorized exception.
5. Use `/human-review` to show the same bounded pattern across borrower, date, and document classification.
6. Package Intelligence: synthetic live package path.
7. Evaluation: clean baseline, digital stress, and raster failure learning.
8. Explain how benchmark failures changed the product (`PKG-DOC-REQ-001`, failure taxonomy, observability direction).
9. Close with zero-false-ready objective, synthetic-data boundaries, and next diagnostic step.

# Assay

An AI-enabled document QC prototype for post-notarization document verification. The system classifies compliance-package documents, evaluates them against a **configurable, jurisdiction-aware rule catalog**, and routes anything it isn't confident about to a human reviewer — who confirms, overrides (with a reason), returns for correction, or escalates. Every automated and human action lands in an audit trail.

**Live demo:** https://assay-navy.vercel.app

**Assay is not a notarization or RON platform.** It doesn't run the notarization event, verify signer identity, or handle e-signing — that's what Snapdocs, Pavaso, and Proof do. Assay is the downstream QC layer that checks whether the *resulting document package* meets jurisdictional requirements before funding, regardless of which channel notarized it (in-person, mobile notary, or remote online notarization).

## Why this exists

Regulated document review — loan closings, KYC, invoice audit, claims — follows the same shape everywhere: intake → classify → check against rules → flag exceptions → report. Assay proves that pattern once, on a synthetic small-business-lending QC workflow, with an architecture built to extend to other verticals.

## What makes the rules "configurable"

Rules are data, not code. A small set of rule *templates* (required-documents, field-presence, count-minimum, date-sequence) are evaluated against per-jurisdiction *parameters* — e.g. minimum witness count, which notary-block fields are required — editable live in the Rule Profile Manager screen. Change a parameter for Florida and every open review recomputes instantly. This is the actual mechanism behind the product's core claim, not two hardcoded demo buttons.

## AI Governance

Fannie Mae's Lender Letter LL-2026-04 (effective August 6, 2026) requires mortgage AI/ML systems to be monitored for performance degradation and drift, with a traceable path from source document to final disposition. Assay's Governance screen is a lightweight illustration of that pattern: override rate by rule, flagged rules above a threshold, and a reminder that confidence is a routing signal — not a calibrated probability of correctness.

## Product principles

- **AI extracts; rules decide.** The model classifies and extracts; a deterministic rules engine determines pass/fail.
- **Confidence is a routing signal, not a probability.** It decides which queue a finding goes to — never treated as a calibrated likelihood of correctness.
- **Critical controls fail safe.** A missing or uncertain critical requirement can never produce an automated "ready" recommendation.
- **No decision without evidence.** Every finding shows where it came from, or explicitly states that nothing was found.
- **Humans stay accountable.** The system recommends; a person disposes. Recommendation, workflow state, and final disposition are three separate fields, never conflated.
- **Rules are data.** Jurisdiction requirements are parameters on a rule template, editable without a code change.

## Status

**Phase 1 (this repo):** interactive shell, 7 screens (dashboard, new review, processing, results, audit history, Rule Profile Manager, AI Governance), 3 preloaded synthetic packages across 3 jurisdictions (TX/CA/FL), a live-computed rules engine, full override/return/escalate/audit workflow.

**Next:**
- A 30-package golden evaluation set with a hard release gate — zero false-ready dispositions.
- Real PDF viewer with click-to-evidence page navigation.
- Live document classification and field extraction (currently: package data is seeded from form inputs or preloaded samples; the rules engine computing over that data is real).

## Stack

React + Vite. No backend, no auth, no real customer data — this is a synthetic-data portfolio prototype, not a production system.

## IP note

Assay is an independently designed portfolio project built with synthetic data, fictional jurisdiction profiles, and original workflows. It does not contain or represent any employer or client product, and its illustrative state rules are not real notary law.

# Assay

An AI-enabled document QC prototype. The system classifies compliance-package documents, evaluates them against a configurable rule catalog, and routes anything it isn't confident about to a human reviewer — who confirms, overrides (with a reason), returns for correction, or escalates. Every automated and human action lands in an audit trail.

**Live demo:** _add your Vercel URL here_
**PRD:** see `/docs` (or link to your portfolio write-up)

## Why this exists

Regulated document review — loan closings, KYC, invoice audit, claims — follows the same shape everywhere: intake → classify → check against rules → flag exceptions → report. Assay proves that pattern once, on a synthetic small-business-lending QC workflow, with an architecture built to extend to other verticals.

## Product principles

- **AI extracts; rules decide.** The model classifies and extracts; a deterministic rules engine determines pass/fail.
- **Confidence is a routing signal, not a probability.** It decides which queue a finding goes to — never treated as a calibrated likelihood of correctness.
- **Critical controls fail safe.** A missing or uncertain critical requirement can never produce an automated "ready" recommendation.
- **No decision without evidence.** Every finding shows where it came from, or explicitly states that nothing was found.
- **Humans stay accountable.** The system recommends; a person disposes. Recommendation, workflow state, and final disposition are three separate fields, never conflated.

## Status

Phase 1 (this repo): interactive shell, 6 screens, 3 preloaded synthetic packages, deterministic demo outputs, full override/return/escalate/audit workflow.
Phase 2 (next): a real rule engine evaluating structured package data, plus a 30-package golden evaluation set with a hard release gate — zero false-ready dispositions.
Phase 3: live document classification and field extraction.

## Stack

React + Vite. No backend, no auth, no real customer data — this is a synthetic-data portfolio prototype, not a production system.

## IP note

Assay is an independently designed portfolio project built with synthetic data, fictional policy profiles, and original workflows. It does not contain or represent any employer or client product.

export const PROFILE_REGISTRY = {
  TX: { id: "MORTGAGE-QC-TX", version: "2.1.0", effectiveAt: "2026-08-01", status: "Published", jurisdiction: "Texas", rules: 10 },
  CA: { id: "MORTGAGE-QC-CA", version: "1.4.0", effectiveAt: "2026-07-15", status: "Published", jurisdiction: "California", rules: 10 },
  FL: { id: "MORTGAGE-QC-FL", version: "3.0.0", effectiveAt: "2026-08-05", status: "Published", jurisdiction: "Florida", rules: 10 },
};

const baseDocuments = [
  { name: "Promissory Note", pages: 6, status: "Classified" },
  { name: "Mortgage or Deed of Trust", pages: 14, status: "Classified" },
  { name: "Closing Disclosure", pages: 5, status: "Classified" },
  { name: "Notice of Right to Cancel", pages: 2, status: "Classified" },
  { name: "Occupancy Affidavit", pages: 2, status: "Classified" },
  { name: "Signature/Name Affidavit", pages: 2, status: "Classified" },
  { name: "Notary Acknowledgment", pages: 1, status: "Classified" },
];

function confidence({ classification, extraction, ocrQuality, evidenceComplete = true, reviewTrigger = null }) {
  return { classification, extraction, ocrQuality, evidenceComplete, reviewTrigger };
}

const cleanRules = [
  { id: "DOC-001", name: "Required closing documents present", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "The published Texas profile requires all seven closing document types.", extractedValue: "7 of 7 required documents", evidence: { sourceDocument: "Package inventory", page: 1, excerpt: "All required documents classified", location: "package" }, confidence: confidence({ classification: 0.99, extraction: null, ocrQuality: "High" }) },
  { id: "LOAN-001", name: "Loan number consistent across package", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "The loan number must match across the Note, Security Instrument and Closing Disclosure.", extractedValue: "LN-884219", evidence: { sourceDocument: "Promissory Note", page: 1, excerpt: "Loan No. LN-884219", location: "top-right header" }, confidence: confidence({ classification: 0.99, extraction: 0.98, ocrQuality: "High" }) },
  { id: "NAME-001", name: "Borrower names consistent", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "Borrower names must normalize to the same legal names across executed documents.", extractedValue: "Maya Patel; Rohan Patel", evidence: { sourceDocument: "Signature/Name Affidavit", page: 1, excerpt: "Maya Patel and Rohan Patel", location: "borrower names" }, confidence: confidence({ classification: 0.98, extraction: 0.96, ocrQuality: "High" }) },
  { id: "SIG-001", name: "Promissory Note signed by all borrowers", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "Every borrower listed on the Note must have a qualifying signature indicator.", extractedValue: "2 of 2 signatures detected", evidence: { sourceDocument: "Promissory Note", page: 6, excerpt: "Signature indicators detected for both borrowers", location: "signature block" }, confidence: confidence({ classification: 0.99, extraction: 0.95, ocrQuality: "High" }) },
  { id: "SIG-002", name: "Security instrument signed", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "The Mortgage or Deed of Trust must be signed by all required parties.", extractedValue: "2 of 2 signatures detected", evidence: { sourceDocument: "Mortgage or Deed of Trust", page: 13, excerpt: "Borrower signature blocks completed", location: "execution block" }, confidence: confidence({ classification: 0.99, extraction: 0.96, ocrQuality: "High" }) },
  { id: "DATE-001", name: "Execution dates present", severity: "Major", fundingCritical: true, status: "Pass", requirement: "Required execution dates must be present and parseable.", extractedValue: "2026-08-06", evidence: { sourceDocument: "Promissory Note", page: 1, excerpt: "August 6, 2026", location: "date field" }, confidence: confidence({ classification: 0.99, extraction: 0.97, ocrQuality: "High" }) },
  { id: "DATE-002", name: "Closing date sequence valid", severity: "Major", fundingCritical: true, status: "Pass", requirement: "Execution, acknowledgment and rescission dates must follow the profile sequence.", extractedValue: "Sequence valid", evidence: { sourceDocument: "Closing Disclosure", page: 1, excerpt: "Closing date 08/06/2026", location: "closing information" }, confidence: confidence({ classification: 0.98, extraction: 0.96, ocrQuality: "High" }) },
  { id: "RTC-001", name: "Notice of Right to Cancel complete", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "Each eligible borrower must sign and date the applicable rescission notice.", extractedValue: "2 signed notices; cancellation deadline 2026-08-10", evidence: { sourceDocument: "Notice of Right to Cancel", page: 2, excerpt: "I acknowledge receipt — signed 08/06/2026", location: "receipt acknowledgment" }, confidence: confidence({ classification: 0.99, extraction: 0.95, ocrQuality: "High" }) },
  { id: "NOT-001", name: "Notary acknowledgment fields complete", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "Venue, acknowledgment date, signer names, notary signature and commission information are required.", extractedValue: "All required fields present", evidence: { sourceDocument: "Notary Acknowledgment", page: 1, excerpt: "Acknowledged before me on August 6, 2026", location: "acknowledgment block" }, confidence: confidence({ classification: 0.98, extraction: 0.94, ocrQuality: "High" }) },
  { id: "NOT-002", name: "Notary commission valid on acknowledgment date", severity: "Critical", fundingCritical: true, status: "Pass", requirement: "The commission expiration must fall after the acknowledgment date.", extractedValue: "Commission expires 2028-11-30", evidence: { sourceDocument: "Notary Acknowledgment", page: 1, excerpt: "My commission expires 11/30/2028", location: "notary seal" }, confidence: confidence({ classification: 0.98, extraction: 0.93, ocrQuality: "High" }) },
];

function cloneRules(rules) {
  return rules.map((rule) => ({ ...rule, evidence: { ...rule.evidence }, confidence: { ...rule.confidence } }));
}

const missingSignatureRules = cloneRules(cleanRules).map((rule) => rule.id === "SIG-001" ? {
  ...rule,
  status: "Fail",
  extractedValue: "1 of 2 signatures detected",
  evidence: { sourceDocument: "Promissory Note", page: 6, excerpt: "Maya Patel signature present; Rohan Patel execution block is blank", location: "borrower signature block" },
  confidence: confidence({ classification: 0.99, extraction: 0.98, ocrQuality: "High", reviewTrigger: "Deterministic missing signature" }),
} : rule);

const lowConfidenceRules = cloneRules(cleanRules).map((rule) => rule.id === "RTC-001" ? {
  ...rule,
  status: "Needs Review",
  extractedValue: "Possible borrower signature; date partially legible",
  evidence: { sourceDocument: "Notice of Right to Cancel", page: 2, excerpt: "Low-resolution scan; possible signature stroke and date 08/0?/2026", location: "receipt acknowledgment" },
  confidence: confidence({ classification: 0.97, extraction: 0.61, ocrQuality: "Low", evidenceComplete: false, reviewTrigger: "Extraction below 0.75 routing threshold" }),
} : rule);

export const DEMO_REVIEWS = [
  { id: "QC-24081", loanId: "LN-884219", borrower: "Maya & Rohan Patel", property: "7408 Willow Bend Dr, Plano, TX", jurisdiction: "TX", channel: "RON", createdAt: "09:12", workflow: "In Review", disposition: null, scenario: "Clean package", documents: baseDocuments, rules: cleanRules, profile: PROFILE_REGISTRY.TX, evaluationContext: { documentHash: "sha256:7cb4…9f21", extractorProvider: "Sample fixture", extractorVersion: "demo-2.0", evaluatedAt: "2026-08-09T09:13:08-05:00" }, processing: { seconds: 12.4, cost: 0, mode: "Preloaded sample package" }, audit: [{ at: "09:12", actor: "System", action: "Package received", detail: "RON channel · 7 documents · 32 pages" }, { at: "09:13", actor: "System", action: "Evaluation completed", detail: "Profile MORTGAGE-QC-TX v2.1.0 pinned · 10 controls evaluated" }] },
  { id: "QC-24078", loanId: "LN-884174", borrower: "Avery Morgan", property: "912 Lakeview Terrace, Austin, TX", jurisdiction: "TX", channel: "MOBILE_NOTARY", createdAt: "08:47", workflow: "In Review", disposition: null, scenario: "Missing signature", documents: baseDocuments, rules: missingSignatureRules, profile: PROFILE_REGISTRY.TX, evaluationContext: { documentHash: "sha256:2d81…ab09", extractorProvider: "Sample fixture", extractorVersion: "demo-2.0", evaluatedAt: "2026-08-09T08:48:13-05:00" }, processing: { seconds: 13.1, cost: 0, mode: "Preloaded sample package" }, audit: [{ at: "08:47", actor: "System", action: "Package received", detail: "Mobile notary channel · 7 documents · 32 pages" }, { at: "08:48", actor: "System", action: "Exception identified", detail: "SIG-001 · one required borrower signature not detected" }] },
  { id: "QC-24072", loanId: "LN-884096", borrower: "Sofia Ramirez", property: "221 Coral Way, Miami, FL", jurisdiction: "FL", channel: "QC_ONLY", createdAt: "08:15", workflow: "In Review", disposition: null, scenario: "Low-quality rescission notice", documents: baseDocuments, rules: lowConfidenceRules, profile: PROFILE_REGISTRY.FL, evaluationContext: { documentHash: "sha256:aa72…8d10", extractorProvider: "Sample fixture", extractorVersion: "demo-2.0", evaluatedAt: "2026-08-09T08:16:17-05:00" }, processing: { seconds: 14.2, cost: 0, mode: "Preloaded sample package" }, audit: [{ at: "08:15", actor: "System", action: "Package received", detail: "QC-only channel · 7 documents · 32 pages" }, { at: "08:16", actor: "System", action: "Human review requested", detail: "RTC-001 · extraction confidence below routing threshold" }] },
];

export const SAMPLE_OPTIONS = DEMO_REVIEWS.map((review) => ({
  id: review.id,
  label: review.scenario,
  description: review.scenario === "Clean package" ? "All controls pass; review the evidence and confirm the package." : review.scenario === "Missing signature" ? "A deterministic critical failure demonstrates correction and exception handling." : "Uncertain evidence demonstrates confidence-based human review.",
}));

import test from "node:test";
import assert from "node:assert/strict";
import { PDF_STRESS_SCENARIOS, createPdfStressFixture, getPdfStressScenario } from "../api/lib/pdfStressFixtures.js";

test("stress set stays intentionally small and fully labeled", () => {
  assert.equal(PDF_STRESS_SCENARIOS.length, 3);
  for (const scenario of PDF_STRESS_SCENARIOS) {
    assert.equal(scenario.label.pageTypes.length, 8);
    assert.ok(scenario.label.expectedRecommendation);
    assert.ok(Object.keys(scenario.label.fields).length >= 8);
  }
});

test("stress fixtures generate eight-page PDFs without external services", async () => {
  for (const scenario of PDF_STRESS_SCENARIOS) {
    const fixture = await createPdfStressFixture(scenario.id);
    assert.equal(fixture.pageCount, 8);
    assert.ok(fixture.byteLength > 1000);
    assert.ok(fixture.base64Source.startsWith("JVBER"));
  }
});

test("structural stress case labels the missing notary evidence explicitly", () => {
  const scenario = getPdfStressScenario("STRESS-003");
  assert.equal(scenario.label.pageTypes[7], "Closing Disclosure");
  assert.equal(scenario.label.fields.notaryAcknowledgmentDate, null);
  assert.equal(scenario.label.fields.notaryCommissionExpirationDate, null);
  assert.equal(scenario.label.evidencePages.notaryAcknowledgmentDate, null);
});

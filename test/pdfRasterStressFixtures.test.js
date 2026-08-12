import test from "node:test";
import assert from "node:assert/strict";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  PDF_RASTER_STRESS_SCENARIOS,
  createPdfRasterStressFixture,
  getPdfRasterStressScenario,
} from "../server/fixtures/pdfRasterStressFixtures.js";

test("raster stress set stays intentionally tiny and fully labeled", () => {
  assert.equal(PDF_RASTER_STRESS_SCENARIOS.length, 2);
  for (const scenario of PDF_RASTER_STRESS_SCENARIOS) {
    assert.equal(scenario.label.pageTypes.length, 8);
    assert.equal(scenario.label.expectedRecommendation, "Needs Review");
    assert.ok(scenario.dpi <= 150);
    assert.ok(scenario.jpegQuality < 70);
  }
});

test("raster fixtures generate eight-page image-only PDFs with no text layer", async () => {
  for (const scenario of PDF_RASTER_STRESS_SCENARIOS) {
    const fixture = await createPdfRasterStressFixture(scenario.id);
    assert.equal(fixture.pageCount, 8);
    assert.equal(fixture.imageOnly, true);
    assert.ok(fixture.byteLength > 20_000);
    assert.ok(fixture.base64Source.startsWith("JVBER"));

    const loadingTask = getDocument({ data: new Uint8Array(Buffer.from(fixture.base64Source, "base64")), disableWorker: true });
    const pdf = await loadingTask.promise;
    assert.equal(pdf.numPages, 8);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const text = await page.getTextContent();
      assert.equal(text.items.length, 0, `${scenario.id} page ${pageNumber} unexpectedly contains a PDF text layer`);
    }
    if (typeof loadingTask.destroy === "function") await loadingTask.destroy();
  }
});

test("skewed raster case applies image-level degradation settings", () => {
  const scenario = getPdfRasterStressScenario("RASTER-002");
  assert.equal(scenario.dpi, 150);
  assert.ok(scenario.rotateDegrees > 0);
  assert.ok(scenario.blurSigma > 0);
  assert.ok(scenario.jpegQuality <= 55);
});

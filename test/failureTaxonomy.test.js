import test from "node:test";
import assert from "node:assert/strict";
import { FAILURE_TAXONOMY, RASTER_LEARNING_V1 } from "../src/data/failureTaxonomy.js";

test("failure taxonomy covers each AI system layer with explicit safe behavior", () => {
  assert.ok(FAILURE_TAXONOMY.length >= 10);
  const ids = new Set();
  for (const item of FAILURE_TAXONOMY) {
    assert.ok(item.id);
    assert.ok(item.layer);
    assert.ok(item.failure);
    assert.ok(item.safeBehavior);
    assert.equal(ids.has(item.id), false, `Duplicate failure taxonomy id: ${item.id}`);
    ids.add(item.id);
  }
  assert.ok(ids.has("OCR-CONFIDENCE-COVERAGE-MISMATCH"));
  assert.ok(ids.has("EVIDENCE-MISSING"));
  assert.ok(ids.has("REQUIRED-DOC-MISSING"));
  assert.ok(ids.has("HUMAN-JUDGMENT"));
});

test("raster learning records failed upstream recovery without a false-ready outcome", () => {
  assert.equal(RASTER_LEARNING_V1.classificationCorrect, 0);
  assert.equal(RASTER_LEARNING_V1.classificationTotal, 16);
  assert.equal(RASTER_LEARNING_V1.extractionCorrect, 0);
  assert.equal(RASTER_LEARNING_V1.extractionTotal, 20);
  assert.equal(RASTER_LEARNING_V1.evidenceCorrect, 0);
  assert.equal(RASTER_LEARNING_V1.evidenceTotal, 18);
  assert.equal(RASTER_LEARNING_V1.recommendationCorrect, 2);
  assert.equal(RASTER_LEARNING_V1.falseReady, 0);
});

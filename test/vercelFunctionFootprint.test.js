import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, "../api");

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJavaScriptFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path.relative(apiDir, fullPath).replaceAll("\\", "/"));
  }
  return files.sort();
}

test("Vercel api directory stays below the Hobby function ceiling", async () => {
  const files = await listJavaScriptFiles(apiDir);
  assert.equal(files.length, 7);
  assert.deepEqual(files.filter((file) => !file.startsWith("lib/")), [
    "analysis.js",
    "analyze.js",
    "package-analysis.js",
    "package-analyze.js",
  ]);
  assert.equal(files.includes("lib/azureDocumentIntelligence.js"), false);
  assert.equal(files.includes("lib/pdfBatchAnalysis.js"), false);
  assert.equal(files.includes("lib/requestGuards.js"), false);
  assert.equal(files.includes("lib/pdfEvaluationFixtures.js"), false);
  assert.equal(files.includes("lib/pdfStressFixtures.js"), false);
});

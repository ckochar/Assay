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

test("Vercel api directory contains only the four HTTP entrypoints", async () => {
  const files = await listJavaScriptFiles(apiDir);
  assert.deepEqual(files, [
    "analysis.js",
    "analyze.js",
    "package-analysis.js",
    "package-analyze.js",
  ]);
  assert.ok(files.length < 12, "Keep free-tier headroom below the historical 12-function ceiling");
});

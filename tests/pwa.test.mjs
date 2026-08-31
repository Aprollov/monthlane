import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("manifest configures Monthlane as an installable standalone app", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.name, "Monthlane");
  assert.equal(manifest.short_name, "Monthlane");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/monthlane/");
  assert.ok(manifest.icons.some(({ sizes }) => sizes === "192x192"));
  assert.ok(manifest.icons.some(({ sizes }) => sizes === "512x512"));
});

test("Pages shell includes iOS metadata and service worker registration", async () => {
  const [html, entry, worker] = await Promise.all([
    readFile(new URL("../pages/index.html", import.meta.url), "utf8"),
    readFile(new URL("../pages/src/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
  assert.match(entry, /registerPwa/);
  assert.match(worker, /referencedAssets/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /self\.skipWaiting\(\)/);
});

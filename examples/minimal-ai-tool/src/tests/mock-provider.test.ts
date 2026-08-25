import { test } from "node:test";
import assert from "node:assert/strict";

import { MockSummarizeProvider, summarizeDeterministically } from "../ai/mock.js";

test("mock provider is deterministic for the same input", async () => {
  const provider = new MockSummarizeProvider();
  const text = "The build failed twice overnight. Retrying manually worked. Root cause is still unknown.";

  const a = await provider.summarize({ text });
  const b = await provider.summarize({ text });

  assert.equal(a.summary, b.summary);
  assert.equal(a.provider, "mock");
  assert.ok(a.summary.startsWith("The build failed twice overnight."));
});

test("mock provider handles whitespace-only input without throwing", async () => {
  const provider = new MockSummarizeProvider();
  const result = await provider.summarize({ text: "   " });
  assert.equal(result.provider, "mock");
  assert.equal(result.summary, "(empty input, 0 key phrases)");
});

test("summarizeDeterministically() counts distinct key phrases", () => {
  const summary = summarizeDeterministically("Invoices stopped emailing customers. Invoices matter a lot.");
  assert.match(summary, /^Invoices stopped emailing customers\. \(\d+ key phrases?\)$/);
});

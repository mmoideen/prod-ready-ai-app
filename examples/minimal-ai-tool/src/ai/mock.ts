import type { SummarizeProvider, SummarizeRequest, SummarizeResult } from "./provider.js";

/**
 * Deterministic extractive summarizer: default provider (see
 * src/ai/index.ts) so that local development, unit tests, end to end
 * tests, and evals/run.mjs never depend on network access or an API key.
 *
 * The algorithm is deliberately trivial and content-addressed only: first
 * sentence of the input, plus a count of distinct "key phrases" (words
 * longer than three characters, excluding a small stop word list). Given
 * the same input it always returns the same output, which is exactly what
 * evals/run.mjs relies on to assert deterministic criteria (mustContain,
 * maxLength) against evals/dataset.jsonl without ever calling a model.
 *
 * evals/run.mjs intentionally mirrors this algorithm directly in plain JS
 * (rather than importing this compiled module) so "npm run eval" never
 * requires a prior "npm run build". Keep the two in sync if you change the
 * algorithm here.
 */

const SENTENCE_SPLIT_PATTERN = /(?<=[.!?])\s+/;
const WORD_PATTERN = /[A-Za-z0-9']+/g;
const MIN_KEY_PHRASE_LENGTH = 3;

const STOP_WORDS: ReadonlySet<string> = new Set([
  "the",
  "and",
  "for",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "this",
  "that",
  "with",
  "from",
  "then",
  "also",
  "into",
  "onto",
  "your",
  "their",
]);

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";
  const parts = trimmed.split(SENTENCE_SPLIT_PATTERN);
  return (parts[0] ?? trimmed).trim();
}

function keyPhraseCount(text: string): number {
  const words = text.match(WORD_PATTERN) ?? [];
  const seen = new Set<string>();
  for (const word of words) {
    const lower = word.toLowerCase();
    if (lower.length <= MIN_KEY_PHRASE_LENGTH) continue;
    if (STOP_WORDS.has(lower)) continue;
    seen.add(lower);
  }
  return seen.size;
}

export function summarizeDeterministically(text: string): string {
  const sentence = firstSentence(text);
  if (sentence.length === 0) {
    return "(empty input, 0 key phrases)";
  }
  const phraseCount = keyPhraseCount(text);
  const phraseWord = phraseCount === 1 ? "phrase" : "phrases";
  return `${sentence} (${phraseCount} key ${phraseWord})`;
}

export class MockSummarizeProvider implements SummarizeProvider {
  readonly name = "mock";

  summarize(request: SummarizeRequest): Promise<SummarizeResult> {
    return Promise.resolve({
      summary: summarizeDeterministically(request.text),
      provider: this.name,
    });
  }
}

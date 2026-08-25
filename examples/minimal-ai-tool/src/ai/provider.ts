/**
 * The provider seam POST /api/summarize is built against. Both
 * implementations in this directory (mock.ts, azure-openai.ts) satisfy this
 * same interface, so src/ai/index.ts can swap one for the other purely by
 * environment configuration with no change to src/server.ts.
 */

export interface SummarizeRequest {
  readonly text: string;
}

export interface SummarizeResult {
  readonly summary: string;
  /** Which provider produced this result, for example "mock" or "azure-openai". */
  readonly provider: string;
}

export interface SummarizeProvider {
  /** Stable provider name, surfaced in logs and the summarize result. */
  readonly name: string;
  summarize(request: SummarizeRequest): Promise<SummarizeResult>;
}

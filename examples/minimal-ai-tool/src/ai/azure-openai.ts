import type { SummarizeProvider, SummarizeRequest, SummarizeResult } from "./provider.js";

/**
 * Azure OpenAI chat completions provider. Uses the global `fetch` (built
 * into Node.js 20+) instead of an SDK, in keeping with this tool's zero
 * runtime dependency constraint. Selected by src/ai/index.ts only when
 * AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT
 * are all set (see src/config.ts); the deterministic mock provider
 * (src/ai/mock.ts) is used otherwise.
 *
 * The API key is read from configuration (ultimately an environment
 * variable) purely for zero-dependency simplicity in this reference
 * implementation. In a real deployment, source AZURE_OPENAI_API_KEY from a
 * vault (see infra/bicep/main.bicep's keyvault module) rather than a plain
 * environment variable baked into a deployment manifest.
 */

export interface AzureOpenAiConfig {
  readonly endpoint: string;
  readonly apiKey: string;
  readonly deployment: string;
  readonly apiVersion: string;
}

interface AzureChatCompletionResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: {
      readonly content?: string | null;
    };
  }>;
}

const SYSTEM_PROMPT =
  "Summarize the user's internal support ticket text in one concise sentence. " +
  "Respond with only the summary sentence, no preamble.";

function buildChatCompletionsUrl(config: AzureOpenAiConfig): string {
  const endpoint = config.endpoint.replace(/\/+$/, "");
  const deployment = encodeURIComponent(config.deployment);
  const apiVersion = encodeURIComponent(config.apiVersion);
  return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
}

export class AzureOpenAiSummarizeProvider implements SummarizeProvider {
  readonly name = "azure-openai";

  readonly #config: AzureOpenAiConfig;

  constructor(config: AzureOpenAiConfig) {
    this.#config = config;
  }

  async summarize(request: SummarizeRequest): Promise<SummarizeResult> {
    const response = await fetch(buildChatCompletionsUrl(this.#config), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": this.#config.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: request.text },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Azure OpenAI request failed with status ${response.status}: ${body}`);
    }

    const payload = (await response.json()) as AzureChatCompletionResponse;
    const summary = payload.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error("Azure OpenAI response did not include a summary");
    }

    return { summary, provider: this.name };
  }
}

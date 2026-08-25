/**
 * AI client factory for the summarize feature.
 *
 * createAiClient() returns a real Azure OpenAI backed client when
 * AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are both set, and a
 * deterministic offline mock client with the same interface otherwise. This
 * keeps the app, its tests, and evals/run.mjs fully usable without network
 * access or a real Azure OpenAI resource.
 */

export interface SummarizeResult {
  /** Short summary of the input text. */
  summary: string;
  /** True when the offline mock client produced this result instead of a real model. */
  usedMock: boolean;
}

export interface AiClient {
  summarize(text: string): Promise<SummarizeResult>;
}

const DEFAULT_DEPLOYMENT = "gpt-4o-mini";
const DEFAULT_API_VERSION = "2024-10-21";
const MOCK_WORD_LIMIT = 24;

/** Offline client: truncates the input to a short, deterministic preview. No network calls. */
function createMockClient(): AiClient {
  return {
    async summarize(text: string): Promise<SummarizeResult> {
      const normalized = text.trim().replace(/\s+/g, " ");
      const words = normalized.length > 0 ? normalized.split(" ") : [];
      const preview = words.slice(0, MOCK_WORD_LIMIT).join(" ");
      const summary =
        words.length > MOCK_WORD_LIMIT
          ? `${preview}...`
          : preview.length > 0
            ? preview
            : "(nothing to summarize)";
      return { summary, usedMock: true };
    },
  };
}

/** Real client: calls an Azure OpenAI chat completion deployment. */
function createAzureOpenAiClient(endpoint: string, apiKey: string): AiClient {
  return {
    async summarize(text: string): Promise<SummarizeResult> {
      const { AzureOpenAI } = await import("openai");
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || DEFAULT_DEPLOYMENT;
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_API_VERSION;

      const client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion,
        deployment,
      });

      const response = await client.chat.completions.create({
        model: deployment,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content: "Summarize the user's text in one short, plain sentence. No preamble.",
          },
          { role: "user", content: text },
        ],
      });

      const summary = response.choices[0]?.message?.content?.trim() ?? "";
      return { summary, usedMock: false };
    },
  };
}

/** Returns a real client when Azure OpenAI env vars are set, otherwise the offline mock. */
export function createAiClient(): AiClient {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (endpoint && apiKey) {
    return createAzureOpenAiClient(endpoint, apiKey);
  }

  return createMockClient();
}

/** Convenience wrapper used by the protected page, an API route, or evals/run.mjs. */
export async function summarize(text: string): Promise<SummarizeResult> {
  const client = createAiClient();
  return client.summarize(text);
}

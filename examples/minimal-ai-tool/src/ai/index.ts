import type { AppConfig } from "../config.js";
import type { SummarizeProvider } from "./provider.js";
import { MockSummarizeProvider } from "./mock.js";
import { AzureOpenAiSummarizeProvider } from "./azure-openai.js";

/**
 * Selects the summarize provider. The Azure OpenAI provider is selected
 * only when config.azureOpenAi is populated, which src/config.ts only does
 * when AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and
 * AZURE_OPENAI_DEPLOYMENT are all set. The deterministic mock provider is
 * the default, so local development, tests, and evals never require
 * network access or an API key.
 */
export function selectProvider(config: AppConfig): SummarizeProvider {
  if (config.azureOpenAi) {
    return new AzureOpenAiSummarizeProvider(config.azureOpenAi);
  }
  return new MockSummarizeProvider();
}

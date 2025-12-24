import type { AIProvider } from "./interface";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

/**
 * Factory function to create the appropriate AI provider based on environment variables
 */
export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "gemini";

  switch (provider) {
    case "gemini":
      return new GeminiProvider(
        process.env.GEMINI_API_KEY || "",
        process.env.GEMINI_MODEL || "gemini-2.5-flash"
      );

    case "openai":
    case "openai-compatible":
      const openaiModel = process.env.OPENAI_MODEL || "gpt-4";
      const openaiBaseURL = process.env.OPENAI_BASE_URL;
      return new OpenAIProvider(
        process.env.OPENAI_API_KEY || "",
        openaiBaseURL,
        openaiModel
      );

    case "anthropic":
      return new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY || "",
        process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
      );

    default:
      console.warn(
        `Unknown AI_PROVIDER: ${provider}. Falling back to Gemini.`
      );
      return new GeminiProvider(
        process.env.GEMINI_API_KEY || "",
        process.env.GEMINI_MODEL || "gemini-2.5-flash"
      );
  }
}

/**
 * Singleton instance of the AI provider
 * Created lazily on first access
 */
let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = createAIProvider();
  }
  return providerInstance;
}

/**
 * Reset the provider instance (useful for testing or provider switching)
 */
export function resetAIProvider(): void {
  providerInstance = null;
}


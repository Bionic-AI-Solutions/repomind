import type { AIProvider } from "./interface";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { ClusterAIProvider } from "./cluster-ai-provider";
import { getClusterAIConfig } from "./cluster-service-discovery";

/**
 * Factory function to create the appropriate AI provider based on environment variables
 * Priority order:
 * 1. CLUSTER_AI_ENABLED=true → Use cluster AI
 * 2. AI_PROVIDER=cluster-ai → Use cluster AI
 * 3. Fallback to configured external provider
 */
export function createAIProvider(): AIProvider {
  // Priority 1: Check if cluster AI is explicitly enabled
  const clusterAIEnabled =
    process.env.CLUSTER_AI_ENABLED?.toLowerCase() === "true";

  // Priority 2: Check if cluster-ai is specified as provider
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "gemini";
  const isClusterAIProvider =
    provider === "cluster-ai" || provider === "cluster-mcp";

  if (clusterAIEnabled || isClusterAIProvider) {
    const config = getClusterAIConfig();
    return new ClusterAIProvider(
      config.baseURL,
      process.env.CLUSTER_AI_MODEL ||
        "/app/models/text_generation/qwen2.5-7b-instruct",
      process.env.CLUSTER_AI_API_KEY
    );
  }

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


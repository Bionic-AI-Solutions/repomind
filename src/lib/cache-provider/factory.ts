import type { CacheProvider } from "./interface";
import { VercelKVProvider } from "./vercel-kv-provider";
import { RedisProvider } from "./redis-provider";

/**
 * Factory function to create the appropriate cache provider based on environment variables
 */
export function createCacheProvider(): CacheProvider {
  const provider = process.env.CACHE_PROVIDER?.toLowerCase();

  // Auto-detect if not specified
  if (!provider) {
    // Check for Redis URL first (more common for self-hosted)
    if (process.env.REDIS_URL) {
      return new RedisProvider(process.env.REDIS_URL);
    }
    // Check for Vercel KV vars
    if (
      process.env.KV_REST_API_URL ||
      process.env.KV_URL ||
      process.env.KV_REST_API_TOKEN
    ) {
      return new VercelKVProvider();
    }
    // Default to Vercel KV if nothing is configured (backward compatibility)
    console.warn(
      "No cache provider explicitly configured. Defaulting to Vercel KV. Set CACHE_PROVIDER=redis|vercel-kv to avoid this warning."
    );
    return new VercelKVProvider();
  }

  switch (provider) {
    case "redis":
      if (!process.env.REDIS_URL) {
        throw new Error(
          "CACHE_PROVIDER=redis requires REDIS_URL environment variable"
        );
      }
      return new RedisProvider(process.env.REDIS_URL);

    case "vercel-kv":
      return new VercelKVProvider();

    default:
      console.warn(
        `Unknown CACHE_PROVIDER: ${provider}. Falling back to Vercel KV.`
      );
      return new VercelKVProvider();
  }
}

/**
 * Singleton instance of the cache provider
 * Created lazily on first access
 */
let providerInstance: CacheProvider | null = null;

export function getCacheProvider(): CacheProvider {
  if (!providerInstance) {
    providerInstance = createCacheProvider();
  }
  return providerInstance;
}

/**
 * Reset the provider instance (useful for testing or provider switching)
 */
export function resetCacheProvider(): void {
  providerInstance = null;
}


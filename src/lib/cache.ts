import { getCacheProvider } from "./cache-provider/factory";

/**
 * Cache utilities for GitHub API responses
 * Works with both Vercel KV and standard Redis
 * Gracefully degrades when cache is unavailable
 */

// Cache TTLs (in seconds)
const TTL_FILE = 3600; // 1 hour
const TTL_REPO = 900; // 15 minutes
const TTL_PROFILE = 1800; // 30 minutes

// Helper to handle cache errors gracefully
async function safeCacheOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
        return await operation();
    } catch (error) {
        console.warn("Cache operation failed (gracefully degrading):", error);
        return null;
    }
}

/**
 * Cache file content with SHA-based key for auto-invalidation
 */
export async function cacheFile(
    owner: string,
    repo: string,
    path: string,
    sha: string,
    content: string
): Promise<void> {
    const key = `file:${owner}/${repo}:${path}:${sha}`;
    const cache = getCacheProvider();
    await safeCacheOperation(() => cache.setex(key, TTL_FILE, content));
}

/**
 * Get cached file content by SHA
 * Returns null if not found or KV unavailable
 */
export async function getCachedFile(
    owner: string,
    repo: string,
    path: string,
    sha: string
): Promise<string | null> {
    const key = `file:${owner}/${repo}:${path}:${sha}`;
    const cache = getCacheProvider();
    return await safeCacheOperation(() => cache.get<string>(key));
}

/**
 * Cache repository metadata
 */
export async function cacheRepoMetadata(
    owner: string,
    repo: string,
    data: any,
    ttl: number = TTL_REPO
): Promise<void> {
    const key = `repo:${owner}/${repo}`;
    const cache = getCacheProvider();
    await safeCacheOperation(() => cache.setex(key, ttl, data));
}

/**
 * Get cached repository metadata
 */
export async function getCachedRepoMetadata(
    owner: string,
    repo: string
): Promise<any | null> {
    const key = `repo:${owner}/${repo}`;
    const cache = getCacheProvider();
    return await safeCacheOperation(() => cache.get<any>(key));
}

/**
 * Cache profile data
 */
export async function cacheProfileData(
    username: string,
    data: any,
    ttl: number = TTL_PROFILE
): Promise<void> {
    const key = `profile:${username}`;
    const cache = getCacheProvider();
    await safeCacheOperation(() => cache.setex(key, ttl, data));
}

/**
 * Get cached profile data
 */
export async function getCachedProfileData(username: string): Promise<any | null> {
    const key = `profile:${username}`;
    const cache = getCacheProvider();
    return await safeCacheOperation(() => cache.get<any>(key));
}

/**
 * Cache File Tree (Large object, important to cache)
 */
export async function cacheFileTree(
    owner: string,
    repo: string,
    branch: string,
    tree: any[]
): Promise<void> {
    const key = `tree:${owner}/${repo}:${branch}`;
    const cache = getCacheProvider();
    await safeCacheOperation(() => cache.setex(key, TTL_REPO, tree));
}

export async function getCachedFileTree(
    owner: string,
    repo: string,
    branch: string
): Promise<any[] | null> {
    const key = `tree:${owner}/${repo}:${branch}`;
    const cache = getCacheProvider();
    return await safeCacheOperation(() => cache.get<any[]>(key));
}

/**
 * Cache Query Selection (Smart Caching)
 * Maps a query to the files selected by AI
 */
export async function cacheQuerySelection(
    owner: string,
    repo: string,
    query: string,
    files: string[]
): Promise<void> {
    // Normalize query to lowercase and trim to increase hit rate
    const normalizedQuery = query.toLowerCase().trim();
    const key = `query:${owner}/${repo}:${normalizedQuery}`;
    const cache = getCacheProvider();
    // Cache for 24 hours - queries usually yield same files
    await safeCacheOperation(() => cache.setex(key, 86400, files));
}

export async function getCachedQuerySelection(
    owner: string,
    repo: string,
    query: string
): Promise<string[] | null> {
    const normalizedQuery = query.toLowerCase().trim();
    const key = `query:${owner}/${repo}:${normalizedQuery}`;
    const cache = getCacheProvider();
    return await safeCacheOperation(() => cache.get<string[]>(key));
}

/**
 * Clear all cache for a repository (useful for manual invalidation)
 */
export async function clearRepoCache(owner: string, repo: string): Promise<void> {
    const pattern = `*:${owner}/${repo}:*`;
    // Note: Pattern-based deletion requires Redis SCAN, not all KV providers support it
    // This is a future enhancement placeholder
    console.log(`Cache clear requested for ${pattern} (not fully implemented)`);
}

/**
 * Get cache statistics (for DevTools)
 */
export async function getCacheStats(): Promise<{
    available: boolean;
    keys?: number;
}> {
    try {
        const cache = getCacheProvider();
        // Simple health check
        const isAvailable = await cache.ping();
        return { available: isAvailable };
    } catch (error) {
        return { available: false };
    }
}

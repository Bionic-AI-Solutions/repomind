// Quick script to clear corrupted cache entries
// Supports both Vercel KV and Redis

console.log('🗑️  Clearing corrupted cache entries...');

try {
    // Dynamic import to handle both ESM and CommonJS
    const { getCacheProvider } = await import('./src/lib/cache-provider/factory.js');
    const cache = getCacheProvider();
    
    // Get all keys (only works with Redis, Vercel KV doesn't support keys())
    const keys = await cache.keys('*');
    
    if (keys.length === 0) {
        console.log('ℹ️  No cache entries found or keys() not supported by this provider');
        console.log('   Note: Vercel KV does not support keys() with patterns');
        process.exit(0);
    }
    
    console.log(`Found ${keys.length} cache keys`);

    // Delete all
    if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
        console.log('✅ Cache cleared successfully!');
    } else {
        console.log('ℹ️  No cache entries found');
    }
} catch (error) {
    console.error('❌ Error clearing cache:', error);
    console.error('   This script requires Redis (keys() not supported by Vercel KV)');
    process.exit(1);
}

process.exit(0);

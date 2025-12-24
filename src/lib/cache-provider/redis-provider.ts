import Redis, { Cluster } from "ioredis";
import type { CacheProvider, Pipeline } from "./interface";

/**
 * Standard Redis Provider Implementation
 * Uses ioredis for Redis connectivity
 * Supports both standalone and cluster mode
 */
export class RedisProvider implements CacheProvider {
  private client: Redis | Cluster;

  constructor(redisUrl?: string) {
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    // Check if this is a cluster connection (multiple hosts or cluster mode)
    const isCluster = this.isClusterConnection(redisUrl);
    
    const baseOptions = {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 5000, // 5 second connection timeout
      commandTimeout: 3000, // 3 second command timeout
    };

    if (isCluster) {
      // Parse cluster nodes from URL or use provided hosts
      const clusterNodes = this.parseClusterNodes(redisUrl);
      this.client = new Cluster(clusterNodes, {
        ...baseOptions,
        redisOptions: {
          ...baseOptions,
        },
        clusterRetryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    } else {
      this.client = new Redis(redisUrl, baseOptions);
    }

    this.client.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    this.client.on("connect", () => {
      console.log("Redis connected successfully");
    });

    if (isCluster) {
      this.client.on("+node", (node) => {
        console.log(`Redis cluster node added: ${node.options.host}:${node.options.port}`);
      });
      this.client.on("-node", (node) => {
        console.log(`Redis cluster node removed: ${node.options.host}:${node.options.port}`);
      });
    }
  }

  /**
   * Check if the connection string indicates cluster mode
   */
  private isClusterConnection(redisUrl: string): boolean {
    // Check for explicit cluster mode flag
    if (redisUrl.includes("cluster=true") || redisUrl.includes("?cluster")) {
      return true;
    }
    
    // Check for multiple hosts (comma-separated)
    if (redisUrl.includes(",")) {
      return true;
    }
    
    // Check if URL contains "cluster" in the hostname (e.g., redis-cluster.redis.svc.cluster.local)
    try {
      const url = new URL(redisUrl.startsWith("redis://") ? redisUrl : `redis://${redisUrl}`);
      if (url.hostname.includes("cluster")) {
        return true;
      }
    } catch {
      // Invalid URL format, treat as standalone
    }
    
    return false;
  }

  /**
   * Parse cluster nodes from connection string
   */
  private parseClusterNodes(redisUrl: string): Array<{ host: string; port: number }> {
    // Remove cluster flags from URL
    const cleanUrl = redisUrl.replace(/[?&]cluster=true/gi, "").replace(/[?&]cluster/gi, "");
    
    // Check for multiple comma-separated hosts
    if (cleanUrl.includes(",")) {
      return cleanUrl.split(",").map((node) => {
        const parsed = this.parseNodeUrl(node.trim());
        return { host: parsed.host, port: parsed.port };
      });
    }
    
    // Single URL - parse it
    const parsed = this.parseNodeUrl(cleanUrl);
    return [{ host: parsed.host, port: parsed.port }];
  }

  /**
   * Parse a single node URL
   */
  private parseNodeUrl(url: string): { host: string; port: number } {
    // Handle redis:// protocol
    if (url.startsWith("redis://")) {
      try {
        const parsed = new URL(url);
        return {
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        };
      } catch {
        // Fall through to default parsing
      }
    }
    
    // Handle host:port format
    const parts = url.replace("redis://", "").split(":");
    return {
      host: parts[0] || "localhost",
      port: parts[1] ? parseInt(parts[1], 10) : 6379,
    };
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Add timeout wrapper for get operations
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Redis get operation timed out after 3 seconds")), 3000);
      });
      
      const valuePromise = this.client.get(key);
      const value = await Promise.race([valuePromise, timeoutPromise]);
      
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error: any) {
      if (error.message?.includes("timeout")) {
        console.warn("Redis get timed out, returning null:", key);
      } else {
        console.warn("Redis get failed:", error);
      }
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.warn("Redis set failed:", error);
    }
  }

  async setex(key: string, ttl: number, value: any): Promise<void> {
    try {
      // Add timeout wrapper for setex operations
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Redis setex operation timed out after 3 seconds")), 3000);
      });
      
      const serialized = JSON.stringify(value);
      const setexPromise = this.client.setex(key, ttl, serialized);
      await Promise.race([setexPromise, timeoutPromise]);
    } catch (error: any) {
      if (error.message?.includes("timeout")) {
        console.warn("Redis setex timed out (non-critical):", key);
      } else {
        console.warn("Redis setex failed:", error);
      }
      // Don't throw - cache failures shouldn't break the app
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn("Redis del failed:", error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.warn("Redis exists failed:", error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      return false;
    }
  }

  pipeline(): Pipeline {
    const pipe = this.client.pipeline();
    const pipelineMethods: Pipeline = {
      setex: (key: string, ttl: number, value: any) => {
        const serialized = JSON.stringify(value);
        pipe.setex(key, ttl, serialized);
        return pipelineMethods;
      },
      sadd: (key: string, ...members: string[]) => {
        pipe.sadd(key, ...members);
        return pipelineMethods;
      },
      hset: (key: string, fieldOrFields: string | Record<string, any>, value?: any) => {
        if (typeof fieldOrFields === "string") {
          const serialized = JSON.stringify(value);
          pipe.hset(key, fieldOrFields, serialized);
        } else {
          // Serialize all values in the object
          const serialized: Record<string, string> = {};
          for (const [k, v] of Object.entries(fieldOrFields)) {
            serialized[k] = JSON.stringify(v);
          }
          pipe.hset(key, serialized);
        }
        return pipelineMethods;
      },
      hincrby: (key: string, field: string, increment: number) => {
        pipe.hincrby(key, field, increment);
        return pipelineMethods;
      },
      incr: (key: string) => {
        pipe.incr(key);
        return pipelineMethods;
      },
      hgetall: (key: string) => {
        pipe.hgetall(key);
        return pipelineMethods;
      },
      exec: async <T = any>() => {
        const results = await pipe.exec();
        if (!results) return [] as T[];
        // Parse JSON values from hgetall results
        return results.map(([err, result]) => {
          if (err) throw err;
          // If result is an object (from hgetall), parse values
          if (result && typeof result === "object" && !Array.isArray(result)) {
            const parsed: Record<string, any> = {};
            for (const [k, v] of Object.entries(result)) {
              try {
                parsed[k] = JSON.parse(v as string);
              } catch {
                parsed[k] = v;
              }
            }
            return parsed as T;
          }
          return result as T;
        });
      },
    };
    return pipelineMethods;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      console.warn("Redis sadd failed:", error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.warn("Redis smembers failed:", error);
      return [];
    }
  }

  async scard(key: string): Promise<number> {
    try {
      return await this.client.scard(key);
    } catch (error) {
      console.warn("Redis scard failed:", error);
      return 0;
    }
  }

  async hset(key: string, fieldOrFields: string | Record<string, any>, value?: any): Promise<void> {
    try {
      if (typeof fieldOrFields === "string") {
        const serialized = JSON.stringify(value);
        await this.client.hset(key, fieldOrFields, serialized);
      } else {
        // Serialize all values
        const serialized: Record<string, string> = {};
        for (const [k, v] of Object.entries(fieldOrFields)) {
          serialized[k] = JSON.stringify(v);
        }
        await this.client.hset(key, serialized);
      }
    } catch (error) {
      console.warn("Redis hset failed:", error);
    }
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      const result = await this.client.hgetall(key);
      if (!result) return {};
      // Parse JSON values
      const parsed: Record<string, any> = {};
      for (const [k, v] of Object.entries(result)) {
        try {
          parsed[k] = JSON.parse(v);
        } catch {
          parsed[k] = v;
        }
      }
      return parsed;
    } catch (error) {
      console.warn("Redis hgetall failed:", error);
      return {};
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    try {
      return await this.client.hincrby(key, field, increment);
    } catch (error) {
      console.warn("Redis hincrby failed:", error);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.warn("Redis incr failed:", error);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.warn("Redis keys failed:", error);
      return [];
    }
  }

  /**
   * Close the Redis connection
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}


import Redis from "ioredis";
import type { CacheProvider, Pipeline } from "./interface";

/**
 * Standard Redis Provider Implementation
 * Uses ioredis for Redis connectivity
 */
export class RedisProvider implements CacheProvider {
  private client: Redis;

  constructor(redisUrl?: string) {
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    this.client.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn("Redis get failed:", error);
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
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
    } catch (error) {
      console.warn("Redis setex failed:", error);
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


import { kv } from "@vercel/kv";
import type { CacheProvider, Pipeline } from "./interface";

/**
 * Vercel KV Provider Implementation
 * Wraps @vercel/kv to match the common cache interface
 */
export class VercelKVProvider implements CacheProvider {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await kv.get<T>(key);
    } catch (error) {
      console.warn("Vercel KV get failed:", error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await kv.setex(key, ttl, value);
      } else {
        await kv.set(key, value);
      }
    } catch (error) {
      console.warn("Vercel KV set failed:", error);
    }
  }

  async setex(key: string, ttl: number, value: any): Promise<void> {
    try {
      await kv.setex(key, ttl, value);
    } catch (error) {
      console.warn("Vercel KV setex failed:", error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.warn("Vercel KV del failed:", error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await kv.exists(key);
      return result === 1;
    } catch (error) {
      console.warn("Vercel KV exists failed:", error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await kv.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  pipeline(): Pipeline {
    const pipe = kv.pipeline();
    const pipelineMethods: Pipeline = {
      setex: (key: string, ttl: number, value: any) => {
        pipe.setex(key, ttl, value);
        return pipelineMethods;
      },
      sadd: (key: string, ...members: string[]) => {
        // Vercel KV pipeline.sadd accepts array as second parameter
        pipe.sadd(key, members);
        return pipelineMethods;
      },
      hset: (key: string, fieldOrFields: string | Record<string, any>, value?: any) => {
        if (typeof fieldOrFields === "string") {
          pipe.hset(key, { [fieldOrFields]: value });
        } else {
          pipe.hset(key, fieldOrFields);
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
        return (await pipe.exec()) as T[];
      },
    };
    return pipelineMethods;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      // Vercel KV sadd accepts array as second parameter
      return await kv.sadd(key, members);
    } catch (error) {
      console.warn("Vercel KV sadd failed:", error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await kv.smembers(key);
    } catch (error) {
      console.warn("Vercel KV smembers failed:", error);
      return [];
    }
  }

  async scard(key: string): Promise<number> {
    try {
      return await kv.scard(key);
    } catch (error) {
      console.warn("Vercel KV scard failed:", error);
      return 0;
    }
  }

  async hset(key: string, fieldOrFields: string | Record<string, any>, value?: any): Promise<void> {
    try {
      if (typeof fieldOrFields === "string") {
        await kv.hset(key, { [fieldOrFields]: value });
      } else {
        await kv.hset(key, fieldOrFields);
      }
    } catch (error) {
      console.warn("Vercel KV hset failed:", error);
    }
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      return (await kv.hgetall(key)) || {};
    } catch (error) {
      console.warn("Vercel KV hgetall failed:", error);
      return {};
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    try {
      return await kv.hincrby(key, field, increment);
    } catch (error) {
      console.warn("Vercel KV hincrby failed:", error);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await kv.incr(key);
    } catch (error) {
      console.warn("Vercel KV incr failed:", error);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      // Vercel KV may not support keys() with patterns
      // This is a limitation - return empty array
      console.warn("Vercel KV does not support keys() with patterns");
      return [];
    } catch (error) {
      console.warn("Vercel KV keys failed:", error);
      return [];
    }
  }
}


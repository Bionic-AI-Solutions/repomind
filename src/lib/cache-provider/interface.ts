/**
 * Common interface for all cache providers
 * Allows swapping between Vercel KV and standard Redis
 */

export interface Pipeline {
  setex(key: string, ttl: number, value: any): Pipeline;
  sadd(key: string, ...members: string[]): Pipeline;
  hset(key: string, field: string, value: any): Pipeline;
  hset(key: string, fields: Record<string, any>): Pipeline;
  hincrby(key: string, field: string, increment: number): Pipeline;
  incr(key: string): Pipeline;
  hgetall(key: string): Pipeline;
  exec<T = any>(): Promise<T[]>;
}

export interface CacheProvider {
  /**
   * Get a value by key
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value with optional TTL
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * Set a value with TTL (Redis SETEX)
   */
  setex(key: string, ttl: number, value: any): Promise<void>;

  /**
   * Delete a key
   */
  del(key: string): Promise<void>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Ping the cache server
   */
  ping(): Promise<boolean>;

  /**
   * Create a pipeline for batch operations
   */
  pipeline(): Pipeline;

  /**
   * Add member(s) to a set
   */
  sadd(key: string, ...members: string[]): Promise<number>;

  /**
   * Get all members of a set
   */
  smembers(key: string): Promise<string[]>;

  /**
   * Get the number of members in a set
   */
  scard(key: string): Promise<number>;

  /**
   * Set a hash field
   */
  hset(key: string, field: string, value: any): Promise<void>;
  hset(key: string, fields: Record<string, any>): Promise<void>;

  /**
   * Get all fields and values of a hash
   */
  hgetall(key: string): Promise<Record<string, any>>;

  /**
   * Increment a hash field by a number
   */
  hincrby(key: string, field: string, increment: number): Promise<number>;

  /**
   * Increment a key
   */
  incr(key: string): Promise<number>;

  /**
   * Get all keys matching a pattern (optional, may not be supported by all providers)
   */
  keys(pattern: string): Promise<string[]>;
}


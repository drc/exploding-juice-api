import env from "@/env";
import type { WeeklyWrappedResponse } from "@/types/dota";

interface CacheEntry {
  data: WeeklyWrappedResponse;
  timestamp: number;
  ttlMinutes: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMinutes: number = env.CACHE_TTL_MINUTES;

  /**
   * Get cached response if it exists and hasn't expired
   */
  get(key: string): WeeklyWrappedResponse | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    const ageMinutes = (now - entry.timestamp) / (1000 * 60);
    if (ageMinutes > entry.ttlMinutes) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry with current timestamp
   */
  set(key: string, data: WeeklyWrappedResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMinutes: this.ttlMinutes,
    });
  }

  /**
   * Check if key exists and hasn't expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

export const responseCache = new ResponseCache();

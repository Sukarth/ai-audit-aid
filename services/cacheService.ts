/**
 * Cache Service
 * Provides hash-based caching for audit results to reduce API costs and improve performance
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    hash: string;
}

class CacheService {
    private cache: Map<string, CacheEntry<any>>;
    private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        this.cache = new Map();
        this.loadFromLocalStorage();
    }

    /**
     * Generate a hash from the input texts
     */
    private async generateHash(texts: string[]): Promise<string> {
        const combined = texts.join('|||');
        const encoder = new TextEncoder();
        const data = encoder.encode(combined);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Create a cache key from document texts
     */
    async createCacheKey(
        currentRegulation: string,
        manual: string,
        oldRegulation?: string,
        framework?: string
    ): Promise<string> {
        const texts = [currentRegulation, manual];
        if (oldRegulation) texts.push(oldRegulation);
        if (framework) texts.push(framework);
        return await this.generateHash(texts);
    }

    /**
     * Get cached audit result
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if cache has expired
        const now = Date.now();
        if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
            this.cache.delete(key);
            this.saveToLocalStorage();
            return null;
        }

        console.log('✓ Cache hit - using cached audit result');
        return entry.data as T;
    }

    /**
     * Set cache entry
     */
    set<T>(key: string, data: T): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            hash: key
        };

        this.cache.set(key, entry);
        this.saveToLocalStorage();
        console.log('✓ Cached audit result for future use');
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.saveToLocalStorage();
        console.log('✓ Cache cleared');
    }

    /**
     * Clear expired entries
     */
    clearExpired(): void {
        const now = Date.now();
        let cleared = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
                this.cache.delete(key);
                cleared++;
            }
        }

        if (cleared > 0) {
            this.saveToLocalStorage();
            console.log(`✓ Cleared ${cleared} expired cache entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; oldestEntry: number | null; newestEntry: number | null } {
        let oldest: number | null = null;
        let newest: number | null = null;

        for (const entry of this.cache.values()) {
            if (oldest === null || entry.timestamp < oldest) {
                oldest = entry.timestamp;
            }
            if (newest === null || entry.timestamp > newest) {
                newest = entry.timestamp;
            }
        }

        return {
            size: this.cache.size,
            oldestEntry: oldest,
            newestEntry: newest
        };
    }

    /**
     * Load cache from localStorage
     */
    private loadFromLocalStorage(): void {
        try {
            const stored = localStorage.getItem('auditCache');
            if (stored) {
                const entries = JSON.parse(stored) as Array<[string, CacheEntry<any>]>;
                this.cache = new Map(entries);
                this.clearExpired();
                console.log(`✓ Loaded ${this.cache.size} cached audit(s) from storage`);
            }
        } catch (error) {
            console.warn('Failed to load cache from localStorage:', error);
            this.cache = new Map();
        }
    }

    /**
     * Save cache to localStorage
     */
    private saveToLocalStorage(): void {
        try {
            const entries = Array.from(this.cache.entries());
            localStorage.setItem('auditCache', JSON.stringify(entries));
        } catch (error) {
            console.warn('Failed to save cache to localStorage:', error);
        }
    }
}

// Export singleton instance
export const cacheService = new CacheService();

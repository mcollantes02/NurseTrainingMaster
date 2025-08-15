import { Timestamp } from 'firebase-admin/firestore';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
}

class Cache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };

  private generateKey(namespace: string, userId: string, extra?: string): string {
    return extra ? `${namespace}:${userId}:${extra}` : `${namespace}:${userId}`;
  }

  get<T>(namespace: string, userId: string, extra?: string): T | null {
    const key = this.generateKey(namespace, userId, extra);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  set<T>(namespace: string, userId: string, data: T, extra?: string, customTtl?: number): void {
    const key = this.generateKey(namespace, userId, extra);
    const ttl = customTtl || this.getDefaultTtl(namespace);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    this.stats.sets++;
  }

  setBatch<T>(namespace: string, userId: string, dataMap: Record<string, T>, customTtl?: number): void {
    Object.entries(dataMap).forEach(([extra, data]) => {
      this.set(namespace, userId, data, extra, customTtl);
    });
  }

  invalidate(namespace: string, userId: string, extra?: string): void {
    if (extra) {
      const key = this.generateKey(namespace, userId, extra);
      this.cache.delete(key);
    } else {
      // Invalidate all keys for this namespace and user
      const prefix = `${namespace}:${userId}`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
    this.stats.invalidations++;
  }

  // Invalidación selectiva más inteligente
  invalidateSelective(namespace: string, userId: string, preserveStatic: boolean = true): void {
    if (preserveStatic && (namespace === 'SUBJECTS' || namespace === 'TOPICS' || namespace === 'MOCK_EXAMS')) {
      // No invalidar datos que cambian poco
      return;
    }
    this.invalidate(namespace, userId);
  }

  private getDefaultTtl(namespace: string): number {
    switch (namespace) {
      case 'MOCK_EXAMS':
      case 'SUBJECTS':
      case 'TOPICS':
        return 2 * 60 * 60 * 1000; // 2 horas - datos que casi no cambian
      case 'QUESTIONS':
        return 30 * 60 * 1000; // 30 minutos - aumentado significativamente
      case 'QUESTION_COUNTS':
      case 'QUESTION_RELATIONS':
      case 'ALL_QUESTION_RELATIONS':
        return 45 * 60 * 1000; // 45 minutos - más tiempo para relaciones
      case 'USER_STATS':
        return 15 * 60 * 1000; // 15 minutos
      case 'TRASHED_QUESTIONS':
        return 60 * 60 * 1000; // 1 hora
      case 'ALL_USER_QUESTIONS':
        return 20 * 60 * 1000; // 20 minutos para el batch completo
      default:
        return 10 * 60 * 1000; // 10 minutos default
    }
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };
  }

  getStats(): CacheStats & { size: number } {
    return { ...this.stats, size: this.cache.size };
  }
}

export const cache = new Cache();
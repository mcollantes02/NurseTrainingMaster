
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
  private locks = new Map<string, Promise<any>>();

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

  // Método optimizado para prevenir consultas duplicadas
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    namespace: string,
    userId: string,
    extra?: string,
    customTtl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(namespace, userId, extra);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending fetch for this key
    const pendingFetch = this.locks.get(key);
    if (pendingFetch) {
      return pendingFetch;
    }

    // Create new fetch promise
    const fetchPromise = fetcher().then(data => {
      this.set(namespace, userId, data, extra, customTtl);
      this.locks.delete(key);
      return data;
    }).catch(error => {
      this.locks.delete(key);
      throw error;
    });

    this.locks.set(key, fetchPromise);
    return fetchPromise;
  }

  // Invalidación inteligente - solo lo necesario
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

  // Invalidación selectiva para operaciones CRUD
  invalidateForOperation(namespace: string, userId: string, operation: 'create' | 'update' | 'delete'): void {
    switch (operation) {
      case 'create':
        // Solo invalidar los listados generales, no datos específicos
        this.invalidate('ALL_USER_QUESTIONS', userId);
        this.invalidate('ALL_QUESTION_RELATIONS', userId);
        this.invalidate('DETAILED_STATS', userId);
        this.invalidate('USER_STATS', userId);
        break;
      case 'update':
        // Invalidar datos específicos y generales
        this.invalidate(namespace, userId);
        this.invalidate('ALL_USER_QUESTIONS', userId);
        this.invalidate('DETAILED_STATS', userId);
        this.invalidate('USER_STATS', userId);
        break;
      case 'delete':
        // Invalidar todo para deletes
        this.invalidate(namespace, userId);
        this.invalidate('ALL_USER_QUESTIONS', userId);
        this.invalidate('ALL_QUESTION_RELATIONS', userId);
        this.invalidate('DETAILED_STATS', userId);
        this.invalidate('USER_STATS', userId);
        break;
    }
  }

  // Invalidación inteligente más granular
  invalidateSmartly(namespace: string, userId: string, operation: 'create' | 'update' | 'delete', identifier?: string): void {
    switch (operation) {
      case 'create':
        // Para creaciones, invalidar solo los listados generales
        this.invalidate('ALL_USER_QUESTIONS', userId);
        this.invalidate('ALL_QUESTION_RELATIONS', userId);
        this.invalidate('QUESTION_COUNTS', userId);
        this.invalidate('DETAILED_STATS', userId);
        this.invalidate('USER_STATS', userId);
        break;
      case 'update':
        // Para actualizaciones, invalidar específicamente
        if (identifier) {
          this.invalidate(namespace, userId, identifier);
        }
        this.invalidate('ALL_USER_QUESTIONS', userId);
        this.invalidate('QUESTION_COUNTS', userId);
        this.invalidate('DETAILED_STATS', userId);
        this.invalidate('USER_STATS', userId);
        break;
      case 'delete':
        // Para eliminaciones, invalidar todo lo relacionado
        this.invalidate(namespace, userId);
        this.invalidate('ALL_USER_QUESTIONS', userId);
        this.invalidate('ALL_QUESTION_RELATIONS', userId);
        this.invalidate('QUESTION_COUNTS', userId);
        this.invalidate('DETAILED_STATS', userId);
        this.invalidate('USER_STATS', userId);
        break;
    }
  }

  private getDefaultTtl(namespace: string): number {
    switch (namespace) {
      case 'MOCK_EXAMS':
      case 'SUBJECTS':
      case 'TOPICS':
        return 30 * 60 * 1000; // 30 minutos - datos que cambian poco
      case 'QUESTIONS':
        return 10 * 60 * 1000; // 10 minutos
      case 'ALL_USER_QUESTIONS':
        return 15 * 60 * 1000; // 15 minutos para el batch completo
      case 'ALL_QUESTION_RELATIONS':
        return 20 * 60 * 1000; // 20 minutos para relaciones
      case 'USER_STATS':
        return 5 * 60 * 1000; // 5 minutos
      case 'DETAILED_STATS':
        return 30 * 60 * 1000; // 30 minutos - estadísticas detalladas
      case 'TRASHED_QUESTIONS':
        return 10 * 60 * 1000; // 10 minutos
      default:
        return 5 * 60 * 1000; // 5 minutos default
    }
  }

  clear(): void {
    this.cache.clear();
    this.locks.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };
  }

  getStats(): CacheStats & { size: number; locks: number } {
    return { ...this.stats, size: this.cache.size, locks: this.locks.size };
  }
}

export const cache = new Cache();

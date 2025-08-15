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
  private locks = new Map<string, Promise<any>>(); // Para prevenir consultas duplicadas simultáneas

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

  // Método para prevenir consultas duplicadas simultáneas
  async getOrFetch<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    namespace: string, 
    userId: string, 
    extra?: string,
    customTtl?: number
  ): Promise<T> {
    // Verificar cache primero
    const cached = this.get<T>(namespace, userId, extra);
    if (cached !== null) {
      return cached;
    }

    // Si ya hay una consulta en progreso para esta key, esperarla
    const lockKey = this.generateKey(namespace, userId, extra);
    if (this.locks.has(lockKey)) {
      return this.locks.get(lockKey);
    }

    // Crear nueva consulta
    const promise = fetcher().then(data => {
      this.set(namespace, userId, data, extra, customTtl);
      this.locks.delete(lockKey);
      return data;
    }).catch(error => {
      this.locks.delete(lockKey);
      throw error;
    });

    this.locks.set(lockKey, promise);
    return promise;
  }

  // Invalidación MUCHO más selectiva - solo invalida lo que realmente cambió
  invalidateSmartly(namespace: string, userId: string, operation: 'create' | 'update' | 'delete', extra?: string): void {
    switch (operation) {
      case 'create':
        // Solo invalidar las consultas que incluyen "todas las preguntas"
        this.invalidate('ALL_USER_QUESTIONS', userId);
        // NO invalidar cache de preguntas específicas ya que no han cambiado
        // Solo invalidar las relaciones si es necesario
        if (namespace === 'QUESTIONS') {
          this.invalidate('ALL_QUESTION_RELATIONS', userId);
        }
        break;
      case 'update':
        // Solo invalidar la consulta específica si existe
        if (extra) {
          this.invalidate(namespace, userId, extra);
        }
        this.invalidate('ALL_USER_QUESTIONS', userId);
        break;
      case 'delete':
        // Invalidar todo el namespace solo en deletes
        this.invalidate(namespace, userId);
        break;
    }
    this.stats.invalidations++;
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
        return 4 * 60 * 60 * 1000; // 4 horas - datos que casi nunca cambian
      case 'QUESTIONS':
        return 60 * 60 * 1000; // 1 hora - aumentado drásticamente
      case 'QUESTION_COUNTS':
      case 'QUESTION_RELATIONS':
      case 'ALL_QUESTION_RELATIONS':
        return 90 * 60 * 1000; // 1.5 horas - más tiempo para relaciones
      case 'USER_STATS':
        return 30 * 60 * 1000; // 30 minutos
      case 'TRASHED_QUESTIONS':
        return 2 * 60 * 60 * 1000; // 2 horas
      case 'ALL_USER_QUESTIONS':
        return 45 * 60 * 1000; // 45 minutos para el batch completo
      default:
        return 20 * 60 * 1000; // 20 minutos default
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
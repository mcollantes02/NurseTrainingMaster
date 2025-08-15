
import { Timestamp } from 'firebase-admin/firestore';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class FirestoreCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  
  // TTL por tipo de datos (en milisegundos) - TTL más largos para reducir operaciones
  private readonly TTL = {
    SUBJECTS: 30 * 60 * 1000,     // 30 minutos - datos muy estáticos
    TOPICS: 30 * 60 * 1000,       // 30 minutos - datos muy estáticos
    MOCK_EXAMS: 15 * 60 * 1000,   // 15 minutos - cambian raramente
    QUESTIONS: 5 * 60 * 1000,     // 5 minutos - datos más dinámicos pero cacheable
    QUESTION_COUNTS: 5 * 60 * 1000, // 5 minutos - se actualiza con preguntas
    QUESTION_RELATIONS: 10 * 60 * 1000, // 10 minutos - relaciones question-mockexam
    USER_STATS: 3 * 60 * 1000,    // 3 minutos - estadísticas de usuario
    TRASHED_QUESTIONS: 10 * 60 * 1000, // 10 minutos - preguntas eliminadas
  };

  private generateKey(prefix: string, userId: string, params?: any): string {
    if (params) {
      const sortedParams = JSON.stringify(params, Object.keys(params).sort());
      return `${prefix}:${userId}:${sortedParams}`;
    }
    return `${prefix}:${userId}`;
  }

  get<T>(prefix: string, userId: string, params?: any): T | null {
    const key = this.generateKey(prefix, userId, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  set<T>(prefix: string, userId: string, data: T, params?: any): void {
    const key = this.generateKey(prefix, userId, params);
    const ttl = this.TTL[prefix as keyof typeof this.TTL] || 60000; // 1 minuto por defecto
    
    // Si ya existía, no incrementar size
    const existed = this.cache.has(key);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    if (!existed) {
      this.stats.size++;
    }
  }

  invalidate(prefix: string, userId: string, params?: any): void {
    if (params) {
      const key = this.generateKey(prefix, userId, params);
      if (this.cache.delete(key)) {
        this.stats.size--;
      }
    } else {
      // Invalidar todos los entries que empiecen con el prefix para este usuario
      const pattern = `${prefix}:${userId}`;
      for (const [key] of this.cache) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
          this.stats.size--;
        }
      }
    }
  }

  invalidateUser(userId: string): void {
    // Invalidar toda la cache para un usuario específico
    for (const [key] of this.cache) {
      if (key.includes(`:${userId}:`)) {
        this.cache.delete(key);
        this.stats.size--;
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Cleanup automático de entradas expiradas
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.stats.size--;
      }
    }
  }

  // Métodos para cache por lotes
  setBatch<T>(prefix: string, userId: string, items: Record<string, T>, baseTtl?: number): void {
    const ttl = baseTtl || this.TTL[prefix as keyof typeof this.TTL] || 60000;
    for (const [itemKey, data] of Object.entries(items)) {
      const key = this.generateKey(prefix, userId, itemKey);
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
      this.stats.size++;
    }
  }

  getBatch<T>(prefix: string, userId: string, itemKeys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const itemKey of itemKeys) {
      result[itemKey] = this.get<T>(prefix, userId, itemKey);
    }
    return result;
  }

  // Invalidar por patrón más específico
  invalidatePattern(pattern: string): void {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.stats.size--;
      }
    }
  }
}

// Instancia global del cache
export const cache = new FirestoreCache();

// Cleanup cada 5 minutos
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

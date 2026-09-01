/**
 * Sistema Unificado e Distribuído de Rate Limiting (Redis + Fallback Local em Memória)
 * Proteção contra Força Bruta, DoS e Abuso de APIs Sensíveis (CWE-307, CWE-770).
 *
 * ARQUITETURA:
 * - Em PRODUÇÃO com Redis: Utiliza cliente Redis (ioredis) para contagem atômica distribuída entre réplicas.
 * - Em DESENVOLVIMENTO / TESTES ou fallback: Utiliza Map em memória com expiração controlada.
 */

import Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  waitMinutes?: number;
}

interface MemoryRecord {
  count: number;
  blockedUntil: number;
  firstAttemptAt: number;
  resetAt: number;
}

// Armazenamento em memória para dev/testes ou fallback
const memoryStore = new Map<string, MemoryRecord>();

// Inicialização do Cliente Redis
const redisUrl = process.env.REDIS_URL;
let redisClient: Redis | null = null;
let isRedisReady = false;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn("⚠️ [RateLimiter] Limite de tentativas de reconexão ao Redis atingido. Alternando para memória.");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on("ready", () => {
      isRedisReady = true;
    });

    redisClient.on("error", (err) => {
      isRedisReady = false;
      if (process.env.NODE_ENV !== "test") {
        console.warn("⚠️ [RateLimiter] Erro de conexão com Redis:", err.message);
      }
    });

    // Conecta de forma não-bloqueante
    redisClient.connect().catch(() => {});
  } catch (e: any) {
    console.warn("⚠️ [RateLimiter] Não foi possível inicializar o cliente Redis:", e.message);
    redisClient = null;
    isRedisReady = false;
  }
} else if (process.env.NODE_ENV === "production" && process.env.ALLOW_MEMORY_RATE_LIMIT_IN_PROD !== "true") {
  console.warn(
    "⚠️ [SECURITY WARNING] REDIS_URL não está configurada em ambiente de produção. " +
    "Para ambientes com múltiplos containers/réplicas Coolify, configure REDIS_URL para rate limiting distribuído consistente."
  );
}

// Limpeza periódica do store em memória a cada 5 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if ((record.blockedUntil > 0 && record.blockedUntil <= now) || (record.resetAt <= now && record.blockedUntil <= now)) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export class RateLimiter {
  /**
   * Consome 1 tentativa e valida se a chave excedeu o limite na janela de tempo especificada.
   */
  static async consume(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();

    // 1. Caminho Distribuído (Redis)
    if (redisClient && isRedisReady) {
      try {
        const countKey = `rl:count:${key}`;
        const blockKey = `rl:blocked:${key}`;

        // Verifica se está bloqueado
        const blockedTtl = await redisClient.pttl(blockKey);
        if (blockedTtl > 0) {
          const resetAt = now + blockedTtl;
          const waitMinutes = Math.ceil(blockedTtl / 60000);
          return {
            allowed: false,
            remaining: 0,
            resetAt,
            waitMinutes,
          };
        }

        // Incremento atômico
        const count = await redisClient.incr(countKey);
        if (count === 1) {
          await redisClient.pexpire(countKey, windowMs);
        }

        if (count > limit) {
          // Bloqueia pela duração da janela
          await redisClient.set(blockKey, "1", "PX", windowMs);
          const waitMinutes = Math.ceil(windowMs / 60000);
          return {
            allowed: false,
            remaining: 0,
            resetAt: now + windowMs,
            waitMinutes,
          };
        }

        const remainingTtl = await redisClient.pttl(countKey);
        const resetAt = remainingTtl > 0 ? now + remainingTtl : now + windowMs;

        return {
          allowed: true,
          remaining: Math.max(0, limit - count),
          resetAt,
        };
      } catch (err) {
        // Fallback silencioso para memória em caso de falha transitória do Redis
      }
    }

    // 2. Caminho em Memória (Fallback ou Dev/Testes)
    const record = memoryStore.get(key);

    if (record) {
      if (record.blockedUntil > now) {
        const waitMinutes = Math.ceil((record.blockedUntil - now) / 60000);
        return {
          allowed: false,
          remaining: 0,
          resetAt: record.blockedUntil,
          waitMinutes,
        };
      }

      if (now > record.resetAt) {
        memoryStore.set(key, {
          count: 1,
          blockedUntil: 0,
          firstAttemptAt: now,
          resetAt: now + windowMs,
        });
        return {
          allowed: true,
          remaining: limit - 1,
          resetAt: now + windowMs,
        };
      }

      record.count += 1;
      if (record.count > limit) {
        record.blockedUntil = now + windowMs;
        const waitMinutes = Math.ceil(windowMs / 60000);
        return {
          allowed: false,
          remaining: 0,
          resetAt: record.blockedUntil,
          waitMinutes,
        };
      }

      return {
        allowed: true,
        remaining: limit - record.count,
        resetAt: record.resetAt,
      };
    }

    // Primeiro acesso
    memoryStore.set(key, {
      count: 1,
      blockedUntil: 0,
      firstAttemptAt: now,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  /**
   * Consulta o estado sem consumir tentativa.
   */
  static async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();

    if (redisClient && isRedisReady) {
      try {
        const countKey = `rl:count:${key}`;
        const blockKey = `rl:blocked:${key}`;

        const blockedTtl = await redisClient.pttl(blockKey);
        if (blockedTtl > 0) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: now + blockedTtl,
            waitMinutes: Math.ceil(blockedTtl / 60000),
          };
        }

        const countStr = await redisClient.get(countKey);
        const count = countStr ? parseInt(countStr, 10) : 0;
        const remainingTtl = await redisClient.pttl(countKey);
        const resetAt = remainingTtl > 0 ? now + remainingTtl : now + windowMs;

        return {
          allowed: count < limit,
          remaining: Math.max(0, limit - count),
          resetAt,
        };
      } catch (err) {}
    }

    const record = memoryStore.get(key);
    if (!record) {
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
      };
    }

    if (record.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.blockedUntil,
        waitMinutes: Math.ceil((record.blockedUntil - now) / 60000),
      };
    }

    if (now > record.resetAt) {
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
      };
    }

    return {
      allowed: record.count < limit,
      remaining: Math.max(0, limit - record.count),
      resetAt: record.resetAt,
    };
  }

  /**
   * Registra falha ou tentativa (alias compatível com testes legados).
   */
  static async recordFailure(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    return this.consume(key, limit, windowMs);
  }

  /**
   * Limpa o registro de uma chave (alias compatível com testes legados).
   */
  static async clear(key: string): Promise<void> {
    return this.reset(key);
  }

  /**
   * Reseta o histórico de uma chave (ex: após login bem-sucedido).
   */
  static async reset(key: string): Promise<void> {
    if (redisClient && isRedisReady) {
      try {
        await redisClient.del(`rl:count:${key}`, `rl:blocked:${key}`);
      } catch (err) {}
    }
    memoryStore.delete(key);
  }

  /**
   * Limpa todo o armazenamento em memória (útil para suítes de testes).
   */
  static resetMemoryStore(): void {
    memoryStore.clear();
  }
}

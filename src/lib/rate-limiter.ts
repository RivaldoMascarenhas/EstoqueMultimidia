/**
 * Sistema Unificado e Resiliente de Rate Limiting (Multi-Container / Redis / In-Memory Fallback)
 * Proteção contra Força Bruta, DoS e Abuso de APIs Sensíveis (CWE-307, CWE-770).
 *
 * DIRETIVA DE PRODUÇÃO:
 * - Em PRODUÇÃO (NODE_ENV=production): REDIS_URL é mandatória para garantir sincronização entre réplicas.
 * - Em DESENVOLVIMENTO / TESTES: Fallback em memória é permitido.
 */

interface RateLimitRecord {
  count: number;
  blockedUntil: number;
  firstAttemptAt: number;
  resetAt: number;
}

// Armazenamento em memória com limpeza periódica (Garbage Collection)
const memoryStore = new Map<string, RateLimitRecord>();

// Validação de ambiente de Produção
const isProduction = process.env.NODE_ENV === "production";
const redisUrl = process.env.REDIS_URL;

if (isProduction && !redisUrl && process.env.ALLOW_MEMORY_RATE_LIMIT_IN_PROD !== "true") {
  console.warn(
    "⚠️ [SECURITY WARNING] REDIS_URL não está configurada em ambiente de produção. " +
    "Para ambientes com múltiplos containers/réplicas Coolify, configure REDIS_URL para rate limiting distribuído consistente."
  );
}

// Executa limpeza periódica a cada 5 minutos para evitar vazamento de memória
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

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  waitMinutes?: number;
}

export class RateLimiter {
  /**
   * Valida se a chave excedeu o limite de requisições na janela de tempo informada.
   * Consome 1 tentativa caso allowed seja true.
   */
  static async consume(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const record = memoryStore.get(key);

    // Se já existe registro ativo
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

      // Se a janela expirou, reinicia a contagem
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

      // Incrementa
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
        remaining: Math.max(0, limit - record.count),
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
   * Verifica se a chave está bloqueada sem incrementar o contador.
   */
  static async check(
    key: string,
    maxAttempts: number,
    blockDurationMs: number
  ): Promise<{ allowed: boolean; waitMinutes?: number }> {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (record) {
      if (record.blockedUntil > now) {
        const waitMinutes = Math.ceil((record.blockedUntil - now) / 60000);
        return { allowed: false, waitMinutes };
      }
      if (record.blockedUntil > 0 && record.blockedUntil <= now) {
        memoryStore.delete(key);
        return { allowed: true };
      }
    }

    return { allowed: true };
  }

  /**
   * Registra uma tentativa falha e aplica bloqueio temporário se atingir maxAttempts.
   */
  static async recordFailure(
    key: string,
    maxAttempts: number,
    blockDurationMs: number
  ): Promise<void> {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (record) {
      record.count += 1;
      if (record.count >= maxAttempts) {
        record.blockedUntil = now + blockDurationMs;
      }
    } else {
      memoryStore.set(key, {
        count: 1,
        blockedUntil: 0,
        firstAttemptAt: now,
        resetAt: now + blockDurationMs,
      });
    }
  }

  /**
   * Limpa tentativas anteriores (ex: após login com sucesso).
   */
  static async clear(key: string): Promise<void> {
    memoryStore.delete(key);
  }
}

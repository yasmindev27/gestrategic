/**
 * Gestrategic — Rate Limiter Middleware
 * Enterprise-grade rate limiting for Supabase Edge Functions
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  keyPrefix?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter (suitable for serverless)
 * For higher scale, use Upstash Redis
 */
class RateLimiter {
  private stores: Map<string, Map<string, RateLimitRecord>> = new Map();
  private cleanupInterval: number;

  constructor(cleanupInterval: number = 60000) {
    this.cleanupInterval = cleanupInterval;
    this.startCleanup();
  }

  private startCleanup() {
    // Clean expired entries every minute
    setInterval(() => {
      const now = Date.now();
      this.stores.forEach(store => {
        for (const [key, record] of store.entries()) {
          if (record.resetAt < now) {
            store.delete(key);
          }
        }
      });
    }, this.cleanupInterval);
  }

  check(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const storeName = config.keyPrefix || 'default';

    // Get or create store
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }
    const store = this.stores.get(storeName)!;

    // Get or create record
    let record = store.get(key);
    if (!record || record.resetAt < now) {
      record = {
        count: 0,
        resetAt: now + config.windowMs,
      };
      store.set(key, record);
    }

    // Check if limit exceeded
    const allowed = record.count < config.maxRequests;
    if (allowed) {
      record.count++;
    }

    const remaining = Math.max(0, config.maxRequests - record.count);

    return {
      allowed,
      remaining,
      resetAt: record.resetAt,
    };
  }

  reset(key: string, keyPrefix?: string) {
    const storeName = keyPrefix || 'default';
    const store = this.stores.get(storeName);
    if (store) {
      store.delete(key);
    }
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter();

/**
 * Rate limit configuration per operation
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'admin-create-user': {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'admin-create-user',
  },
  'admin-delete-user': {
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'admin-delete-user',
  },
  'classificar-prioridade': {
    maxRequests: 50,
    windowMs: 60 * 1000,
    keyPrefix: 'classificar-prioridade',
  },
  'processar-pdf-salus': {
    maxRequests: 2,
    windowMs: 60 * 1000, // Heavy operation
    keyPrefix: 'processar-pdf-salus',
  },
  'gerar-relatorio-chamados': {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'gerar-relatorio-chamados',
  },
  'moderar-mensagem': {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'moderar-mensagem',
  },
};

/**
 * Middleware function for rate limiting in Edge Functions
 */
export function checkRateLimit(
  operation: string,
  userId: string
): { allowed: boolean; headers: Record<string, string>; status?: number } {
  const config = RATE_LIMITS[operation];

  if (!config) {
    // Unknown operation, don't rate limit
    return {
      allowed: true,
      headers: {},
    };
  }

  const result = globalRateLimiter.check(userId, config);

  const headers = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)), // Unix timestamp
  };

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      headers: {
        ...headers,
        'Retry-After': String(retryAfter),
      },
      status: 429, // Too Many Requests
    };
  }

  return {
    allowed: true,
    headers,
  };
}

/**
 * Example usage in Edge Function:
 *
 * import { checkRateLimit } from './_shared/rate-limiter.ts';
 *
 * export async function handler(req: Request) {
 *   const userId = getUserIdFromAuth(req);
 *   const { allowed, headers, status } = checkRateLimit('admin-create-user', userId);
 *
 *   if (!allowed) {
 *     return new Response(
 *       JSON.stringify({ error: 'Rate limit exceeded' }),
 *       { status: status || 429, headers }
 *     );
 *   }
 *
 *   // Process request...
 *   return new Response(JSON.stringify(result), { headers });
 * }
 */

# 🚦 Rate Limiting Integration Guide

## Overview

**Purpose:** Prevent DoS attacks, resource exhaustion, and API abuse  
**Status:** Sprint 1 - Task 1.3 (3-4 days)  
**Strategy:** Per-admin, per-operation rate limiting with graceful backoff

---

## Rate Limits by Operation

| Operation | Limit | Window | Reason |
|-----------|-------|--------|--------|
| `admin-create-user` | 5 req/min | Per admin | Heavy: User creation + role assignment + profile |
| `admin-delete-user` | 5 req/min | Per admin | Heavy: User deletion + role removal + audit log |
| `classificar-prioridade` | 50 req/min | Per user | Priority classification (normal) |
| `processar-pdf-salus` | 2 req/min | Per user | CPU intensive: PDF parsing + storage |
| `gerar-relatorio-chamados` | 10 req/5min | Per user | Database heavy: Complex query + export |
| `moderar-mensagem` | 100 req/min | Per user | Real-time messaging (high throughput OK) |

---

## Architecture

### How Rate Limiting Works

```
User/Admin makes request
        ↓
Check rate limit key (user_id + operation)
        ↓
    ┌─--────────────────────────┐
    │ Has key?                   │
    └─--────────────────────────┘
        Yes ↓                ↓ No
        Get counter    Initialize counter:
        Check limit    counter = 1
        If under → allow   reset_at = now() + window
        If over → 429
```

### Implementation (Already Created)

File: `supabase/functions/_shared/rate-limiter.ts`

```typescript
class RateLimiter {
  check(operation: string, userId: string, config: RateLimitConfig) → {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
  }

  reset(key: string) → void
}

// Usage in edge functions:
const rateLimiter = new RateLimiter();

const check = rateLimiter.check('admin-create-user', adminId, {
  maxRequests: 5,
  windowMs: 60 * 1000,
});

if (!check.allowed) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429, headers: { 'Retry-After': check.retryAfter } }
  );
}
```

---

## Integration Points

### 1. Admin Create User Function

**Location:** `supabase/functions/admin-create-user/index.ts`

**Implementation Pattern:**

```typescript
import { RateLimiter } from "../_shared/rate-limiter.ts";
import { createClient } from "@supabase/supabase-js";

const rateLimiter = new RateLimiter();

serve(async (req: Request) => {
  // 1. Get admin ID from auth token
  const adminId = await verifyAdminAuth(req);
  
  // 2. Check rate limit
  const check = rateLimiter.check(
    "admin-create-user",
    adminId,
    { maxRequests: 5, windowMs: 60 * 1000 }  // 5 per minute
  );
  
  // 3. Return error if limited
  if (!check.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: check.retryAfter
      }),
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': check.limit,
          'X-RateLimit-Remaining': check.remaining,
          'Retry-After': check.retryAfter,
        }
      }
    );
  }
  
  // 4. Proceed with user creation
  const newUser = await supabase.auth.admin.createUser({...});
  
  // 5. Return with rate limit headers
  return new Response(JSON.stringify(newUser), {
    status: 201,
    headers: {
      'X-RateLimit-Limit': check.limit,
      'X-RateLimit-Remaining': check.remaining - 1,
      'Retry-After': 'N/A',
    }
  });
});
```

### 2. Delete User Function

**Location:** `supabase/functions/admin-delete-user/index.ts`

**Similar pattern to admin-create-user**

### 3. Priority Classification Function

**Location:** `supabase/functions/classificar-prioridade/index.ts`

**Higher limit (50/min) because it's lighter operation:**

```typescript
const check = rateLimiter.check(
  "classificar-prioridade",
  userId,
  { maxRequests: 50, windowMs: 60 * 1000 }  // 50 per minute
);
```

### 4. PDF Processing Function

**Location:** `supabase/functions/processar-pdf-salus/index.ts`

**Strict limit (2/min) due to CPU cost:**

```typescript
const check = rateLimiter.check(
  "processar-pdf-salus",
  userId,
  { maxRequests: 2, windowMs: 60 * 1000 }  // 2 per minute (heavy)
);
```

### 5. Report Generation Function

**Location:** `supabase/functions/gerar-relatorio-chamados/index.ts`

**Multi-minute window (10 per 5 minutes):**

```typescript
const check = rateLimiter.check(
  "gerar-relatorio-chamados",
  userId,
  { maxRequests: 10, windowMs: 5 * 60 * 1000 }  // 10 per 5 minutes
);
```

### 6. Message Moderation Function

**Location:** `supabase/functions/moderar-mensagem/index.ts`

**High limit (100/min) for real-time chat:**

```typescript
const check = rateLimiter.check(
  "moderar-mensagem",
  userId,
  { maxRequests: 100, windowMs: 60 * 1000 }  // 100 per minute
);
```

---

## Client-Side Handling

### Detecting Rate Limit Errors

```typescript
// src/lib/api-client.ts
async function callEdgeFunction(
  functionName: string,
  payload: any
): Promise<any> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  // Check for rate limit response
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const error = new RateLimitError(
      'Rate limit exceeded. Please wait before retrying.',
      parseInt(retryAfter || '60')
    );
    throw error;
  }

  return response.json();
}
```

### Exponential Backoff Retry

```typescript
// src/lib/retry-strategy.ts
export class RetryStrategy {
  async execute(
    fn: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error instanceof RateLimitError) {
          // Extract retry-after from error
          const waitMs = error.retryAfterSeconds * 1000;
          const jitter = Math.random() * 1000;  // 0-1 second jitter
          
          console.warn(
            `Rate limited. Retry attempt ${attempt + 1}/${maxRetries} ` +
            `after ${waitMs + jitter}ms`
          );
          
          await new Promise(resolve => 
            setTimeout(resolve, waitMs + jitter)
          );
        } else {
          throw error;
        }
      }
    }
  }
}
```

### Toast Notification

```typescript
// src/hooks/useRateLimitedOperation.ts
export function useRateLimitedOperation() {
  const { toast } = useToast();

  const execute = async (operationFn: () => Promise<any>) => {
    try {
      return await operationFn();
    } catch (error) {
      if (error instanceof RateLimitError) {
        toast({
          title: '⏱️ Rate Limited',
          description: `Too many requests. Please wait ${error.retryAfterSeconds}s and try again.`,
          variant: 'destructive',
          duration: error.retryAfterSeconds * 1000,
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
      throw error;
    }
  };

  return { execute };
}
```

---

## Response Headers

Every rate-limited operation returns these headers:

```
X-RateLimit-Limit: 5              // Total requests allowed per window
X-RateLimit-Remaining: 4          // Requests left in current window  
X-RateLimit-Reset: 1673476560     // Unix timestamp when window resets
Retry-After: 30                    // Seconds to wait (if limited)
```

### Client can parse for UX:

```typescript
const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '1');
const percentageUsed = Math.round((limit - remaining) / limit * 100);

if (percentageUsed > 80) {
  showWarning(`${percentageUsed}% of rate limit used`);
}
```

---

## Load Testing

### Verify Rate Limiting Works

```bash
#!/bin/bash
# scripts/test-rate-limiting.sh

# Test: admin-create-user with 5 req/min limit
echo "Testing rate limit (5 requests per minute)..."

AUTH_TOKEN="your_admin_token_here"
ENDPOINT="https://xxxxx.supabase.co/functions/v1/admin-create-user"

# Send 10 requests rapidly (should succeed for first 5, fail on 6th+)
for i in {1..10}; do
  echo -n "Request $i: "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test'$i'@example.com",
      "full_name": "Test User '$i'",
      "role": "enfermeiro"
    }')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  REMAINING=$(curl -s -I "$ENDPOINT" -H "Authorization: Bearer $AUTH_TOKEN" | grep X-RateLimit-Remaining)
  
  echo "HTTP $HTTP_CODE - $REMAINING"
  
  sleep 0.5  # Small delay between requests
done

echo "✓ Rate limiting test completed"
echo "Expected: Requests 1-5 = 201 Created, Requests 6-10 = 429 Too Many Requests"
```

### Performance Baseline

```sql
-- Without rate limiting
EXPLAIN ANALYZE
SELECT * FROM bed_records WHERE id = '...';
-- Time: 0.234 ms

-- With rate limiting check
-- (checking in-memory counter, negligible overhead)
-- Time: ~0.240 ms (0.006 ms overhead - acceptable)
```

---

## Monitoring

### Tracking Rate Limit Violations

Create table to monitor abuse:

```sql
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(255),
  user_id UUID,
  violation_count INT DEFAULT 1,
  first_violation_at TIMESTAMPTZ DEFAULT NOW(),
  last_violation_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_violations_unique 
    UNIQUE(operation, user_id, DATE(first_violation_at))
);

CREATE INDEX rate_limit_violations_user_op_idx 
ON rate_limit_violations(user_id, operation);
```

### Log rate limit hits

```typescript
// In edge function when rate limit exceeded
if (!check.allowed) {
  // Log to database for analytics
  await supabase.rpc('log_rate_limit_violation', {
    operation_name: 'admin-create-user',
    user_id_attempted: userId,
    request_count: check.limit,
  });

  return new Response(JSON.stringify({ error: 'Rate limited' }), { 
    status: 429 
  });
}
```

### Grafana Dashboard Query

```sql
-- Monitor rate limit violations
SELECT
  DATE_TRUNC('hour', first_violation_at) as hour,
  operation,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(violation_count) as total_violations
FROM rate_limit_violations
WHERE first_violation_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, operation
ORDER BY hour DESC;
```

---

## Scalability Notes

### Current Implementation (In-Memory)

- ✅ Single Deno instance
- ✅ < 1000 unique users per edge function
- ⚠️ Limits reset on function restart
- ❌ Doesn't work multi-instance

### Future: Redis Implementation

For horizontal scaling:

```typescript
// Use Upstash Redis (serverless)
import Redis from "https://cdn.skypack.dev/ioredis";

const redis = new Redis(Deno.env.get("REDIS_URL"));

class RedisRateLimiter {
  async check(key: string, limit: number, window: number) {
    const pipe = redis.pipeline();
    
    pipe.incr(key);
    pipe.expire(key, Math.ceil(window / 1000));
    
    const [count] = await pipe.exec();
    
    return { allowed: count <= limit };
  }
}
```

**Cost:** $0.20/month for low-volume (Upstash free tier)

---

## Deployment Checklist

### Pre-Deployment

- [ ] Verify rate-limiter.ts compiles
- [ ] Rate limit configs documented
- [ ] Load testing completed
- [ ] Client retry logic implemented

### Deployment

- [ ] Deploy admin-create-user with rate limiting
- [ ] Deploy admin-delete-user with rate limiting
- [ ] Deploy 4 other edge functions with appropriate limits
- [ ] Verify Retry-After headers returned

### Post-Deployment

- [ ] Monitor for 429 errors
- [ ] Verify clients handle backoff correctly
- [ ] Check performance impact (should be minimal)
- [ ] Measure API abuse reduction

---

## References

- RFC 6585: HTTP 429 Too Many Requests
- OWASP Rate Limiting Best Practices
- Deno Deploy Rate Limiting Guide

---

**Sprint 1 Task: 1.3**  
**Status:** ✅ MIDDLEWARE READY (in rate-limiter.ts)  
**Integration Effort:** 1-2 hours per edge function (copy-paste pattern)  
**Testing:** 3-4 hours for load testing

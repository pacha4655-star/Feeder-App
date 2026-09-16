import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window cache
const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 3600 * 1000);
      if (record.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit?: number; // Maximum allowed requests
  windowMs?: number; // Time window in milliseconds
  identifier?: string; // Optional custom identifier (e.g. userId or ip)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in ms when limit resets
  retryAfterSeconds: number; // Seconds to wait if blocked
}

/**
 * Extracts a client IP from Next.js request headers.
 */
export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Evaluates rate limit for an action using a sliding window.
 */
export function checkRateLimit(
  bucket: string,
  key: string,
  options?: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const limit = options?.limit ?? 60;
  const windowMs = options?.windowMs ?? 60 * 1000;
  const storageKey = `${bucket}:${key}`;

  let record = memoryStore.get(storageKey);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(storageKey, record);
  }

  // Filter timestamps within the sliding window
  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime,
      retryAfterSeconds,
    };
  }

  // Record this request
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetTime = now + windowMs;

  return {
    allowed: true,
    limit,
    remaining,
    resetTime,
    retryAfterSeconds: 0,
  };
}

/**
 * Creates a standard HTTP 429 Too Many Requests response with proper headers.
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please slow down and try again later.',
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': result.retryAfterSeconds.toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      },
    }
  );
}

/**
 * Distributed rate limiter supporting Upstash Redis REST across multi-instance deployments.
 * Falls back transparently to in-memory sliding window if Upstash is not configured.
 */
export async function checkRateLimitDistributed(
  bucket: string,
  key: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return checkRateLimit(bucket, key, options);
  }

  const limit = options?.limit ?? 60;
  const windowMs = options?.windowMs ?? 60 * 1000;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${bucket}:${key}`;

  try {
    // Pipeline: INCR + EXPIRE via Upstash REST API
    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSeconds],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) {
      return checkRateLimit(bucket, key, options);
    }

    const data = (await response.json()) as Array<{ result: number }>;
    const count = data?.[0]?.result ?? 1;
    const now = Date.now();
    const resetTime = now + windowMs;

    if (count > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime,
        retryAfterSeconds: windowSeconds,
      };
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - count),
      resetTime,
      retryAfterSeconds: 0,
    };
  } catch (err) {
    // Fall back safely to in-memory store if network call fails
    return checkRateLimit(bucket, key, options);
  }
}

// Configurable presets via environment variables
export const RATE_LIMIT_CONFIG = {
  auth: {
    limit: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '15', 10),
    windowMs: 15 * 60 * 1000, // 15 requests / 15 minutes
  },
  postCreation: {
    limit: parseInt(process.env.RATE_LIMIT_POST_MAX || '30', 10),
    windowMs: 60 * 60 * 1000, // 30 posts / hour
  },
  commentCreation: {
    limit: parseInt(process.env.RATE_LIMIT_COMMENT_MAX || '100', 10),
    windowMs: 60 * 60 * 1000, // 100 comments / hour
  },
  reactions: {
    limit: parseInt(process.env.RATE_LIMIT_REACTION_MAX || '180', 10),
    windowMs: 60 * 60 * 1000, // 180 reactions / hour
  },
  sosCreation: {
    limit: parseInt(process.env.RATE_LIMIT_SOS_MAX || '6', 10),
    windowMs: 60 * 60 * 1000, // 6 SOS alerts / hour
  },
  messages: {
    limit: parseInt(process.env.RATE_LIMIT_MESSAGE_MAX || '60', 10),
    windowMs: 60 * 1000, // 60 messages / minute
  },
  reports: {
    limit: parseInt(process.env.RATE_LIMIT_REPORT_MAX || '10', 10),
    windowMs: 60 * 60 * 1000, // 10 reports / hour
  },
  search: {
    limit: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '90', 10),
    windowMs: 60 * 1000, // 90 queries / minute
  },
  uploads: {
    limit: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '20', 10),
    windowMs: 60 * 60 * 1000, // 20 uploads / hour
  },
  ai: {
    limit: parseInt(process.env.RATE_LIMIT_AI_MAX || '25', 10),
    windowMs: 60 * 1000, // 25 AI queries / minute
  },
};

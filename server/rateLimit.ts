import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RateLimitModel } from './models/RateLimit.ts';
import { isMongoConnected } from './mongo.ts';

interface RateBucket {
  count: number;
  resetAt: number;
}

const MAX_LOCAL_BUCKETS = 10_000;

export function extractClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
  namespace?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const buckets = new Map<string, RateBucket>();
  const ns = options.namespace ?? 'default';

  // Periodically prune expired in-memory rate-limit entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, options.windowMs).unref();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey = options.keyGenerator ? options.keyGenerator(req) : extractClientIp(req);
    const keyHash = crypto.createHash('sha256').update(`${ns}:${rawKey}`).digest('hex').slice(0, 32);
    const now = Date.now();

    // Use distributed MongoDB atomic counters when connected so load-balanced replicas share limits
    if (isMongoConnected()) {
      try {
        const windowIndex = Math.floor(now / options.windowMs);
        const windowKey = `${ns}:${windowIndex}:${keyHash}`;
        const resetAtMs = (windowIndex + 1) * options.windowMs;
        const resetAt = new Date(resetAtMs);

        const doc = await RateLimitModel.findOneAndUpdate(
          { key: windowKey },
          {
            $inc: { count: 1 },
            $setOnInsert: { resetAt },
          },
          { upsert: true, new: true }
        );

        const count = doc?.count ?? 1;
        res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - count)));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAtMs / 1000)));

        if (count > options.maxRequests) {
          const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
          res.setHeader('Retry-After', String(retryAfterSec));
          res.status(429).json({ error: options.message });
          return;
        }
        next();
        return;
      } catch {
        // Fall through to bounded local bucket if MongoDB transient error occurs
      }
    }

    const existing = buckets.get(keyHash);
    if (!existing || existing.resetAt <= now) {
      if (buckets.size >= MAX_LOCAL_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey) buckets.delete(oldestKey);
      }
      const resetAt = now + options.windowMs;
      buckets.set(keyHash, { count: 1, resetAt });
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(options.maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(existing.resetAt / 1000)));
      res.status(429).json({ error: options.message });
      return;
    }

    existing.count += 1;
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, options.maxRequests - existing.count))
    );
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(existing.resetAt / 1000)));
    next();
  };
}

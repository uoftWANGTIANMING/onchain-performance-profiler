import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: number[];
}

class ApiRateLimiter {
  private store: RateLimitStore = {};
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || 'unknown';
      const now = Date.now();

      if (!this.store[key]) {
        this.store[key] = [];
      }

      this.store[key] = this.store[key].filter(time => now - time < this.windowMs);

      if (this.store[key].length >= this.maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${this.maxRequests} requests per ${this.windowMs / 1000} seconds.`,
          retryAfter: Math.ceil((this.windowMs - (now - this.store[key][0])) / 1000)
        });
        return;
      }

      this.store[key].push(now);
      next();
    };
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  headers: Record<string, string>;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 30000) {
    this.ttl = ttlMs;
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, data: any, headers: Record<string, string> = {}): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      headers
    });
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(req: Request): string {
    return `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
  }
}

export const rateLimiter = new ApiRateLimiter(100, 60000);
export const responseCache = new ResponseCache(30000);

export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  const cacheKey = responseCache.generateKey(req);
  const cached = responseCache.get(cacheKey);

  if (cached) {
    res.set(cached.headers);
    return res.json(cached.data);
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    responseCache.set(cacheKey, body, res.getHeaders() as Record<string, string>);
    return originalJson(body);
  };

  next();
}


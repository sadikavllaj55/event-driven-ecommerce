import type { Request, Response, NextFunction } from 'express';

// Configuration
const WINDOW_MS = 10_000; // 10 second window
const MAX_REQUESTS = 5; // max requests per window per IP

// In-memory store: IP -> list of request timestamps
const requests = new Map<string, number[]>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();

  // Get this IP's recent request timestamps (or empty list)
  const timestamps = requests.get(ip) ?? [];

  // Keep only timestamps within the current window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    // Too many requests in the window
    const oldest = recent[0];
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);

    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'too many requests',
      retry_after_seconds: retryAfter,
    });
  }

  // Record this request and allow it
  recent.push(now);
  requests.set(ip, recent);

  next();
}

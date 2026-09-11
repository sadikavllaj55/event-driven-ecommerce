import type { Request, Response, NextFunction } from 'express';

// Logs every request with method, path, status, and duration
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // When the response finishes, log the details
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`,
    );
  });

  next(); // pass control to the next middleware
}

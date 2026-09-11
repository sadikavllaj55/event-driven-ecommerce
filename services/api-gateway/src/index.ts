import express from 'express';
import { requestLogger } from './middleware/logger.ts';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { rateLimiter } from './middleware/rateLimiter.ts';
import { requireRole } from './middleware/rbac.ts';
import helmet from 'helmet';

const PORT = process.env.PORT ?? '8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL ?? 'http://localhost:8081';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

// --- Health check ---
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// --- Login: issues a JWT token ---
// (In a real system you'd verify credentials against a user store.)
app.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};

  // Demo user store (in production: hashed passwords in a database)
  const users: Record<string, { password: string; role: string }> = {
    admin: { password: 'password', role: 'admin' },
    user: { password: 'password', role: 'user' },
  };

  const account = users[username];

  if (account && account.password === password) {
    const token = jwt.sign({ sub: username, role: account.role }, JWT_SECRET, {
      expiresIn: '1h',
    });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'invalid credentials' });
});

// --- Auth middleware: verifies the JWT ---
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'missing or invalid Authorization header' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

// --- Protected: forward order creation to the Order Service ---
app.post('/orders', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Failed to reach Order Service:', err);
    res.status(502).json({ error: 'order service unavailable' });
  }
});

// Admin-only endpoint — requires a valid JWT AND the "admin" role
app.get(
  '/admin/stats',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json({
      message: 'Welcome to the admin dashboard',
      accessed_by: user.sub,
      role: user.role,
      stats: {
        note: 'This is protected admin-only data',
      },
    });
  },
);

app.listen(Number(PORT), () => {
  console.log(`API Gateway running on port ${PORT}`);
});

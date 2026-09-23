import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { requestLogger } from './middleware/logger.ts';
import { rateLimiter } from './middleware/rateLimiter.ts';
import { requireRole } from './middleware/rbac.ts';

// ---------- Config ----------
const PORT = process.env.PORT ?? '8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL ?? 'http://localhost:8082';
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:8083';
const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL ?? 'http://localhost:8084';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL ?? 'http://localhost:8081';

// ---------- Types ----------
interface AuthUser {
  sub: string;
  email: string;
  role: string;
}
interface AuthedRequest extends Request {
  user?: AuthUser;
}

// ---------- App + global middleware ----------
const app = express();
app.use(helmet());
app.use(requestLogger);
app.use(rateLimiter);

// ---------- Auth middleware ----------
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as AuthUser;
    (req as AuthedRequest).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

// Injects the authenticated user's ID as X-User-ID for downstream services
function injectUserId(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (user) req.headers['x-user-id'] = user.sub;
  next();
}

// Small helper to build a proxy to a target service
const gateway = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    // Preserve the original URL path when forwarding (don't strip the mount path)
    pathRewrite: (_path, req) => (req as Request).originalUrl,
  });

// ---------- Health (gateway itself) ----------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// ---------- Login (verifies via User Service, issues JWT) ----------
app.post('/login', express.json(), async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const response = await fetch(`${USER_SERVICE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return res
        .status(response.status)
        .json({ error: body.error ?? 'invalid credentials' });
    }
    const user = await response.json();
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    return res.json({ token });
  } catch (err) {
    console.error('Login failed calling user service:', err);
    return res
      .status(502)
      .json({ error: 'authentication service unavailable' });
  }
});

// ---------- PUBLIC routes ----------
app.post('/register', gateway(USER_SERVICE_URL));
app.get('/products', gateway(PRODUCT_SERVICE_URL));
app.get('/products/:id', gateway(PRODUCT_SERVICE_URL));

// ---------- PROTECTED routes (require JWT) ----------
// Products (seller — identity via X-User-ID)
app.post('/products', authenticate, injectUserId, gateway(PRODUCT_SERVICE_URL));
app.put(
  '/products/:id',
  authenticate,
  injectUserId,
  gateway(PRODUCT_SERVICE_URL),
);
app.delete(
  '/products/:id',
  authenticate,
  injectUserId,
  gateway(PRODUCT_SERVICE_URL),
);

// Product images
app.get('/products/:id/images', gateway(PRODUCT_SERVICE_URL)); // public
app.post(
  '/products/:id/images',
  authenticate,
  injectUserId,
  gateway(PRODUCT_SERVICE_URL),
);
app.delete(
  '/products/:id/images/:imageId',
  authenticate,
  injectUserId,
  gateway(PRODUCT_SERVICE_URL),
);

// Cart (buyer identity via X-User-ID)
app.use('/cart', authenticate, injectUserId, gateway(CART_SERVICE_URL));

// Orders (buyer identity via X-User-ID)
app.use('/orders', authenticate, injectUserId, gateway(ORDER_SERVICE_URL));

// ---------- Admin ----------
app.get(
  '/admin/stats',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const user = (req as AuthedRequest).user!;
    res.json({
      message: 'Welcome to the admin dashboard',
      accessed_by: user.sub,
      role: user.role,
    });
  },
);

app.listen(Number(PORT), () => {
  console.log(`API Gateway running on port ${PORT}`);
});

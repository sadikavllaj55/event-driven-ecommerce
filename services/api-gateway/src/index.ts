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
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL ?? 'http://localhost:8082';
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:8083';
const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL ?? 'http://localhost:8084';

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
app.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // Ask the User Service to verify the credentials
    const response = await fetch(`${USER_SERVICE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const user = await response.json();

    // Issue a JWT with the real user's id and role
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
    // Inject buyer_id from the verified token (not trusted from the body)
    req.body.buyer_id = (req as any).user.sub;

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

// ---------- PUBLIC routes ----------

// Register a new user (public)
app.post('/register', (req, res) => {
  proxy(req, res, USER_SERVICE_URL, '/register');
});

// Browse products (public)
app.get('/products', (req, res) => {
  proxy(req, res, PRODUCT_SERVICE_URL, '/products');
});
app.get('/products/:id', (req, res) => {
  proxy(req, res, PRODUCT_SERVICE_URL, `/products/${req.params.id}`);
});

// ---------- PROTECTED routes (require JWT) ----------

// Create a product (authenticated — sellers)
app.post('/products', authenticate, (req, res) => {
  // Inject the seller_id from the verified token (users can't fake it!)
  req.body.seller_id = (req as any).user.sub;
  proxy(req, res, PRODUCT_SERVICE_URL, '/products');
});

// Cart operations (authenticated — the buyer is from the token)
app.get('/cart', authenticate, (req, res) => {
  const buyerId = (req as any).user.sub;
  proxy(req, res, CART_SERVICE_URL, `/cart/${buyerId}`);
});
app.post('/cart/items', authenticate, (req, res) => {
  const buyerId = (req as any).user.sub;
  proxy(req, res, CART_SERVICE_URL, `/cart/${buyerId}/items`);
});
app.delete('/cart/items/:productId', authenticate, (req, res) => {
  const buyerId = (req as any).user.sub;
  proxy(
    req,
    res,
    CART_SERVICE_URL,
    `/cart/${buyerId}/items/${req.params.productId}`,
  );
});
app.post('/cart/checkout', authenticate, (req, res) => {
  const buyerId = (req as any).user.sub;
  proxy(req, res, CART_SERVICE_URL, `/cart/${buyerId}/checkout`);
});

// Order history (authenticated — buyer identity from the token)
app.get('/orders', authenticate, (req, res) => {
  const buyerId = (req as any).user.sub;
  proxy(req, res, ORDER_SERVICE_URL, '/orders', { 'X-User-ID': buyerId });
});

app.get('/orders/:id', authenticate, (req, res) => {
  const buyerId = (req as any).user.sub;
  proxy(req, res, ORDER_SERVICE_URL, `/orders/${req.params.id}`, {
    'X-User-ID': buyerId,
  });
});

// Forwards a request to a target service and returns the response to the client
async function proxy(
  req: Request,
  res: Response,
  targetBaseUrl: string,
  targetPath: string,
  extraHeaders: Record<string, string> = {},
) {
  try {
    const hasBody = req.method !== 'GET' && req.method !== 'DELETE';
    const response = await fetch(`${targetBaseUrl}${targetPath}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    res
      .status(response.status)
      .set(
        'Content-Type',
        response.headers.get('Content-Type') ?? 'application/json',
      )
      .send(data);
  } catch (err) {
    console.error(`Proxy error to ${targetBaseUrl}${targetPath}:`, err);
    res.status(502).json({ error: 'upstream service unavailable' });
  }
}

app.listen(Number(PORT), () => {
  console.log(`API Gateway running on port ${PORT}`);
});

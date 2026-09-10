import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT ?? '8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL ?? 'http://localhost:8081';

const app = express();
app.use(express.json());

// --- Health check ---
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// --- Login: issues a JWT token ---
// (In a real system you'd verify credentials against a user store.)
app.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};

  // Demo credentials
  if (username === 'admin' && password === 'password') {
    const token = jwt.sign({ sub: username, role: 'user' }, JWT_SECRET, {
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

app.listen(Number(PORT), () => {
  console.log(`API Gateway running on port ${PORT}`);
});

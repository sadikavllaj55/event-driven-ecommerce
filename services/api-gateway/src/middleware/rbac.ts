import type { Request, Response, NextFunction } from 'express';

// requireRole returns a middleware that only allows users with one of the
// given roles. Must run AFTER the authenticate middleware (which sets req.user).
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // No user means authenticate middleware didn't run or failed
    if (!user) {
      return res.status(401).json({ error: 'not authenticated' });
    }

    // Check if the user's role is allowed
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }

    next(); // role is allowed, continue
  };
}

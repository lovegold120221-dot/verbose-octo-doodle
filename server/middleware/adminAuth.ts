import type { Request, Response, NextFunction } from 'express';

const ADMIN_USERS = (process.env.ADMIN_USERS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const firebaseToken = req.headers['x-firebase-token'] as string;

  if (!userId || !userEmail) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (ADMIN_USERS.length > 0) {
    const email = userEmail.toLowerCase();
    if (!ADMIN_USERS.includes(email)) {
      res.status(403).json({ error: 'Unauthorized: admin access required' });
      return;
    }
  }

  (req as any).adminUser = { uid: userId, email: userEmail, firebaseToken };
  next();
}

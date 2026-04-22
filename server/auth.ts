import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'campus-store-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

export interface AuthRequest extends Request {
  userId?: number;
  user?: {
    id: number;
    username: string;
    email: string | null;
    isAdmin: boolean;
  };
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }

  req.userId = decoded.userId;

  const { storage } = await import('./storage');
  const user = await storage.getUserById(req.userId);
  if (user) {
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    };
  }

  next();
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const { storage } = await import('./storage');
  const user = await storage.getUserById(req.userId);

  if (!user || !user.isAdmin) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin
  };

  next();
}

// Socket.IO authentication helper
export async function authenticateTokenForSocket(token: string): Promise<{
  id: number;
  firstName: string;
  lastName: string;
  avatar: string | null;
} | null> {
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    const { storage } = await import('./storage');
    const user = await storage.getUserById(decoded.userId);
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar
    };
  } catch (error) {
    return null;
  }
}

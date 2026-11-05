import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { prisma } from './prisma.js';
import type { AuthUser, AuthedRequest } from './types.js';

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.role !== 'string') throw new Error('Invalid token');
    req.user = { id: payload.sub, name: String(payload.name ?? ''), email: String(payload.email ?? ''), role: payload.role as AuthUser['role'] };
    next();
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or expired. Sign in again.' });
  }
}

export function allowRoles(...roles: AuthUser['role'][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    next();
  };
}

export async function requireApplicationKey(req: AuthedRequest, res: Response, next: NextFunction) {
  const key = req.header('x-api-key');
  if (!key) return res.status(401).json({ error: 'Missing application API key.' });
  const keyHash = createHash('sha256').update(key).digest('hex');
  const application = await prisma.application.findUnique({ where: { keyHash } });
  if (!application || application.revokedAt) return res.status(401).json({ error: 'Application API key is invalid or revoked.' });
  res.locals.application = application;
  next();
}


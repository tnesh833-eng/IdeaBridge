import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
  getUserProfileById,
  upsertUserFromFirebase,
  type PublicUserProfile,
} from './db.ts';
import { verifyFirebaseIdToken } from './firebaseAuth.ts';

// Keep secret strictly on the server; fall back to ephemeral 32-byte key in dev preview
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  authUser?: PublicUserProfile;
  authSource?: 'firebase' | 'session';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function timingSafeStringMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface TokenPayload {
  sub: string;
  exp: number;
}

export function issueSessionToken(userId: string): string {
  const payload: TokenPayload = {
    sub: userId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return null;

  const encoded = token.slice(0, dotIdx);
  const signature = token.slice(dotIdx + 1);
  if (!encoded || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded.sub || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function resolveUserFromToken(
  token: string
): Promise<{ user: PublicUserProfile; source: 'firebase' | 'session' } | null> {
  // 1. Check local HMAC token (2-part encoded.signature)
  const parts = token.split('.');
  if (parts.length === 2) {
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const user = getUserProfileById(payload.sub);
    return user ? { user, source: 'session' } : null;
  }

  // 2. Check Firebase Auth JWT ID Token (3-part header.payload.signature)
  if (parts.length === 3) {
    const decoded = await verifyFirebaseIdToken(token);
    if (!decoded || !decoded.uid || !decoded.email) {
      return null;
    }
    const user = upsertUserFromFirebase({
      uid: decoded.uid,
      email: decoded.email,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
    });
    return { user, source: 'firebase' };
  }

  return null;
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  if (token) {
    const resolved = await resolveUserFromToken(token);
    if (resolved) {
      req.authUser = resolved.user;
      req.authSource = resolved.source;
    }
  }
  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }

  const resolved = await resolveUserFromToken(token);
  if (!resolved) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.authUser = resolved.user;
  req.authSource = resolved.source;
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required to import SIH problem statements.' });
    return;
  }
  next();
}

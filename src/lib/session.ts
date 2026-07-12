import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'a-very-secure-secret-key-of-at-least-32-characters';

export interface SessionPayload {
  userId: string;
}

// Scrypt sync key generator
function getKey(): Buffer {
  return crypto.scryptSync(SESSION_SECRET, 'salt-wardrobe', 32);
}

/**
 * Encrypts a session payload into an AES-256-CBC string.
 */
export function encryptSession(payload: SessionPayload): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a session string back into its original payload.
 */
export function decryptSession(sessionStr: string): SessionPayload | null {
  try {
    const parts = sessionStr.split(':');
    if (parts.length !== 2) return null;
    
    const ivHex = parts[0];
    const encryptedHex = parts[1];

    // IV must be 16 bytes (32 hex characters)
    if (ivHex.length !== 32) return null;

    // Validate hex format
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(ivHex) || !hexRegex.test(encryptedHex)) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted) as SessionPayload;
  } catch {
    // Fail silently on tampering or invalid inputs to avoid log pollution
    return null;
  }
}

/**
 * Creates and sets a secure cookie on the response store.
 */
export async function setSessionCookie(payload: SessionPayload) {
  const sessionStr = encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set('session', sessionStr, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Reads the session cookie and decodes the user payload.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get('session')?.value;
  if (!sessionVal) return null;
  return decryptSession(sessionVal);
}

/**
 * Utility to extract user session from incoming request headers (if cookie store is bypassed)
 */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const sessionVal = req.cookies.get('session')?.value;
  if (!sessionVal) return null;
  return decryptSession(sessionVal);
}

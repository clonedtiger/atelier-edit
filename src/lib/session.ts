import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'a-very-secure-secret-key-of-at-least-32-characters';

export interface SessionPayload {
  userId: string;
}

// Derive a 32-byte key using HKDF with SHA-256
function getDerivedKey(): Buffer {
  return Buffer.from(
    crypto.hkdfSync('sha256', SESSION_SECRET, 'salt-wardrobe-atelier-v2', 'session-encryption-key', 32)
  );
}

// Legacy key for smooth backward compatibility
function getLegacyKey(): Buffer {
  return crypto.scryptSync(SESSION_SECRET, 'salt-wardrobe', 32);
}

/**
 * Encrypts a session payload using AES-256-GCM (Authenticated Encryption with Associated Data).
 * Returns format: gcm:<ivHex>:<authTagHex>:<ciphertextHex>
 */
export function encryptSession(payload: SessionPayload): string {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', getDerivedKey(), iv);
  
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a session string back into its original payload.
 * Supports both AES-256-GCM and legacy AES-256-CBC payloads.
 */
export function decryptSession(sessionStr: string): SessionPayload | null {
  if (!sessionStr || typeof sessionStr !== 'string') return null;

  try {
    const parts = sessionStr.split(':');

    // 1. AES-256-GCM Format (gcm:iv:tag:ciphertext)
    if (parts[0] === 'gcm' && parts.length === 4) {
      const ivHex = parts[1];
      const tagHex = parts[2];
      const cipherHex = parts[3];

      const hexRegex = /^[0-9a-fA-F]+$/;
      if (!hexRegex.test(ivHex) || !hexRegex.test(tagHex) || !hexRegex.test(cipherHex)) {
        return null;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', getDerivedKey(), iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as SessionPayload;
    }

    // 2. Legacy AES-256-CBC Fallback (iv:ciphertext)
    if (parts.length === 2) {
      const ivHex = parts[0];
      const encryptedHex = parts[1];

      if (ivHex.length !== 32) return null;

      const hexRegex = /^[0-9a-fA-F]+$/;
      if (!hexRegex.test(ivHex) || !hexRegex.test(encryptedHex)) return null;

      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(encryptedHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', getLegacyKey(), iv);

      let decrypted = decipher.update(encryptedText, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as SessionPayload;
    }

    return null;
  } catch {
    // Fail silently on tampering or invalid inputs to avoid log pollution
    return null;
  }
}

/**
 * Creates and sets a secure HTTP-only cookie on the response store.
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
 * Utility to extract user session from incoming request headers
 */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const sessionVal = req.cookies.get('session')?.value;
  if (!sessionVal) return null;
  return decryptSession(sessionVal);
}

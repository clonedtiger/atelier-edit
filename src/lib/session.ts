import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const DEFAULT_SECRET = 'a-very-secure-secret-key-of-at-least-32-characters';

export interface SessionPayload {
  userId: string;
}

function getCandidateSecrets(): string[] {
  const list: string[] = [];
  if (process.env.NEXTAUTH_SECRET) list.push(process.env.NEXTAUTH_SECRET);
  if (process.env.SESSION_SECRET) list.push(process.env.SESSION_SECRET);
  if (!list.includes(DEFAULT_SECRET)) list.push(DEFAULT_SECRET);
  return list;
}

// Derive a 32-byte key using HKDF with SHA-256 for a given secret
function deriveKeyForSecret(secret: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync('sha256', secret, 'salt-wardrobe-atelier-v2', 'session-encryption-key', 32)
  );
}

// Legacy key for smooth backward compatibility
function getLegacyKeyForSecret(secret: string): Buffer {
  return crypto.scryptSync(secret, 'salt-wardrobe', 32);
}

/**
 * Encrypts a session payload using AES-256-GCM (Authenticated Encryption with Associated Data).
 * Returns format: gcm:<ivHex>:<authTagHex>:<ciphertextHex>
 */
export function encryptSession(payload: SessionPayload): string {
  const primarySecret = process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKeyForSecret(primarySecret), iv);
  
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a session string back into its original payload.
 * Supports both AES-256-GCM and legacy AES-256-CBC payloads with multi-secret fallback.
 */
export function decryptSession(sessionStr: string): SessionPayload | null {
  if (!sessionStr || typeof sessionStr !== 'string') return null;

  const candidateSecrets = getCandidateSecrets();

  for (const secret of candidateSecrets) {
    try {
      const decodedStr = sessionStr.includes('%') ? decodeURIComponent(sessionStr) : sessionStr;
      const parts = decodedStr.split(':');

      // 1. AES-256-GCM Format (gcm:iv:tag:ciphertext)
      if (parts[0] === 'gcm' && parts.length === 4) {
        const ivHex = parts[1];
        const tagHex = parts[2];
        const cipherHex = parts[3];

        const hexRegex = /^[0-9a-fA-F]+$/;
        if (!hexRegex.test(ivHex) || !hexRegex.test(tagHex) || !hexRegex.test(cipherHex)) {
          continue;
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKeyForSecret(secret), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted) as SessionPayload;
      }

      // 2. Legacy AES-256-CBC Fallback (iv:ciphertext)
      if (parts.length === 2) {
        const ivHex = parts[0];
        const encryptedHex = parts[1];

        if (ivHex.length !== 32) continue;

        const hexRegex = /^[0-9a-fA-F]+$/;
        if (!hexRegex.test(ivHex) || !hexRegex.test(encryptedHex)) continue;

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', getLegacyKeyForSecret(secret), iv);

        let decrypted = decipher.update(encryptedText, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted) as SessionPayload;
      }
    } catch {
      // Try next secret candidate
      continue;
    }
  }

  return null;
}

/**
 * Creates and sets a secure HTTP-only cookie on the response store.
 * Uses '__session' to ensure Firebase Hosting reverse proxy forwards it to Cloud Run.
 */
export async function setSessionCookie(payload: SessionPayload) {
  const sessionStr = encryptSession(payload);
  const cookieStore = await cookies();
  
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  };

  // Set Firebase Hosting standard __session cookie
  cookieStore.set('__session', sessionStr, options);
  // Also set legacy session cookie for backward compatibility
  cookieStore.set('session', sessionStr, options);
}

/**
 * Clears the session cookies.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('__session');
  cookieStore.delete('session');
}

/**
 * Reads the session cookie and decodes the user payload.
 */
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  // 1. If NextRequest was passed, check its parsed cookies and raw headers first
  if (req) {
    const val = req.cookies.get('__session')?.value || req.cookies.get('session')?.value;
    if (val) {
      const decrypted = decryptSession(val);
      if (decrypted) return decrypted;
    }
    const rawHeader = req.headers.get('cookie');
    if (rawHeader) {
      const match = rawHeader.match(/(?:^|;\s*)(?:__session|session)=([^;]+)/);
      if (match) {
        const decrypted = decryptSession(match[1]);
        if (decrypted) return decrypted;
      }
    }
  }

  // 2. Fallback to App Router cookies() store
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get('__session')?.value || cookieStore.get('session')?.value;
    if (sessionVal) {
      return decryptSession(sessionVal);
    }
  } catch {
    // Ignore context error if cookies() not available
  }

  return null;
}

/**
 * Utility to extract user session from incoming request headers
 */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const sessionVal = req.cookies.get('__session')?.value || req.cookies.get('session')?.value;
  if (sessionVal) {
    const decrypted = decryptSession(sessionVal);
    if (decrypted) return decrypted;
  }
  const rawHeader = req.headers.get('cookie');
  if (rawHeader) {
    const match = rawHeader.match(/(?:^|;\s*)(?:__session|session)=([^;]+)/);
    if (match) {
      return decryptSession(match[1]);
    }
  }
  return null;
}

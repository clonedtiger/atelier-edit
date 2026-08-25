import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 4648 Base32 string (standard for Google Authenticator, 1Password, etc.)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string back to Buffer
 */
export function base32Decode(base32Str: string): Buffer {
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 or hexadecimal secret key for Multi-Factor Authentication (MFA).
 */
export function generateMfaSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Generates standard Base32 secret for authenticator apps.
 */
export function generateBase32MfaSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/**
 * Builds an otpauth://totp/... URI string for QR code generation in authenticator apps.
 */
export function getTotpAuthUri(secret: string, accountEmail: string, issuer = 'Atelier Edit'): string {
  // If the secret is hex (40 chars), convert to Base32 for standard QR code apps
  let base32Secret = secret;
  if (/^[0-9a-fA-F]{40}$/.test(secret)) {
    base32Secret = base32Encode(Buffer.from(secret, 'hex'));
  }
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}?secret=${encodeURIComponent(base32Secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a 6-digit TOTP code for a given secret key and time offset (steps of 30 seconds).
 */
export function generateTOTP(secret: string, timeIndex: number): string {
  let key: Buffer;
  
  if (/^[0-9a-fA-F]+$/.test(secret) && secret.length % 2 === 0) {
    key = Buffer.from(secret, 'hex');
  } else {
    key = base32Decode(secret);
  }

  // Time index converted to an 8-byte buffer
  const buffer = Buffer.alloc(8);
  let tmp = timeIndex;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = tmp & 0xff;
    tmp = tmp >> 8;
  }

  // HMAC-SHA-1 computation
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();

  // Dynamic Truncation
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  // Pad to 6 digits
  const otp = (code % 1000000).toString();
  return otp.padStart(6, '0');
}

/**
 * Verifies a 6-digit code against the secret key, allowing a clock drift of +/- 1 window (30 seconds).
 */
export function verifyMfaToken(secret: string, token: string): boolean {
  if (!token || token.length !== 6) return false;

  const currentStep = Math.floor(Date.now() / 30000);

  // Check current, previous, and next window to accommodate clock sync drift
  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTOTP(secret, currentStep + i);
    if (expectedToken === token) {
      return true;
    }
  }

  return false;
}

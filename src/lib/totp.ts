import crypto from 'crypto';

/**
 * Generates a random hexadecimal secret key for Multi-Factor Authentication (MFA).
 */
export function generateMfaSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Generates a 6-digit TOTP code for a given secret key and time offset (steps of 30 seconds).
 */
export function generateTOTP(secret: string, timeIndex: number): string {
  const key = Buffer.from(secret, 'hex');

  // Time index converted to a 8-byte buffer
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

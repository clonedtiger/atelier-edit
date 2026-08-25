import { encryptSession, decryptSession } from '@/lib/session';
import { generateBase32MfaSecret, getTotpAuthUri, generateTOTP, verifyMfaToken } from '@/lib/totp';

describe('Security & Cryptography Hardening Tests', () => {
  describe('AES-256-GCM Authenticated Session Encryption', () => {
    it('should correctly encrypt and decrypt session payload using AES-256-GCM', () => {
      const payload = { userId: 'user-auth-uuid-99238' };
      const encrypted = encryptSession(payload);

      expect(encrypted.startsWith('gcm:')).toBe(true);
      expect(encrypted.split(':')).toHaveLength(4);

      const decrypted = decryptSession(encrypted);
      expect(decrypted).not.toBeNull();
      expect(decrypted?.userId).toBe('user-auth-uuid-99238');
    });

    it('should reject tampered ciphertext and authentication tags', () => {
      const payload = { userId: 'user-secret-12345' };
      const encrypted = encryptSession(payload);
      const parts = encrypted.split(':');

      // Tamper with authentication tag
      const tamperedTag = parts[2].replace(/^[0-9a-f]/, (c) => (c === '0' ? '1' : '0'));
      const tamperedEncrypted = `gcm:${parts[1]}:${tamperedTag}:${parts[3]}`;

      const decrypted = decryptSession(tamperedEncrypted);
      expect(decrypted).toBeNull();
    });

    it('should reject malformed or arbitrary garbage inputs safely', () => {
      expect(decryptSession('')).toBeNull();
      expect(decryptSession('random-nonsense')).toBeNull();
      expect(decryptSession('gcm:12:34:56')).toBeNull();
      expect(decryptSession('gcm:invalid_hex:invalid_tag:invalid_cipher')).toBeNull();
    });
  });

  describe('RFC 6238 Base32 TOTP & Authenticator Compatibility', () => {
    it('should generate valid Base32 secret and valid otpauth URI', () => {
      const secret = generateBase32MfaSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);

      const uri = getTotpAuthUri(secret, 'testuser@example.com', 'Atelier Edit');
      expect(uri).toContain('otpauth://totp/Atelier%20Edit:testuser%40example.com');
      expect(uri).toContain(`secret=${secret}`);
      expect(uri).toContain('issuer=Atelier%20Edit');
    });

    it('should verify generated TOTP code within time window', () => {
      const secret = generateBase32MfaSecret();
      const currentStep = Math.floor(Date.now() / 30000);
      const code = generateTOTP(secret, currentStep);

      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
      expect(verifyMfaToken(secret, code)).toBe(true);
    });

    it('should reject invalid or expired TOTP tokens', () => {
      const secret = generateBase32MfaSecret();
      expect(verifyMfaToken(secret, '000000')).toBe(false);
      expect(verifyMfaToken(secret, '999999')).toBe(false);
      expect(verifyMfaToken(secret, '123')).toBe(false);
    });
  });
});

import bcrypt from 'bcryptjs';
import { encryptSession, decryptSession } from '@/lib/session';
import { generateMfaSecret, generateTOTP, verifyMfaToken } from '@/lib/totp';

describe('auth & session helper logic', () => {
  
  describe('password hashing (bcryptjs)', () => {
    it('should successfully hash and verify passwords', async () => {
      const password = 'mySuperSecurePassword123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      expect(hash).not.toBe(password);
      
      const isMatch = await bcrypt.compare(password, hash);
      const isWrongMatch = await bcrypt.compare('wrongPassword', hash);

      expect(isMatch).toBe(true);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('cookie session encryption (session.ts)', () => {
    it('should encrypt and decrypt payload objects securely', () => {
      const payload = { userId: 'user-uuid-1234-5678' };
      
      const sessionString = encryptSession(payload);
      expect(sessionString).toContain(':'); // IV separator

      const decrypted = decryptSession(sessionString);
      expect(decrypted).toEqual(payload);
    });

    it('should return null for malformed session strings', () => {
      const result = decryptSession('badsessionstringwithoutivseparator');
      expect(result).toBeNull();
      
      const resultBadData = decryptSession('abcdef1234567890:badencryptedhex');
      expect(resultBadData).toBeNull();
    });
  });

  describe('2FA TOTP generation & verification (totp.ts)', () => {
    it('should generate a 2FA secret and verify valid 6-digit dynamic codes', () => {
      const secret = generateMfaSecret();
      expect(secret).toHaveLength(40); // 20 hex bytes = 40 characters

      const currentStep = Math.floor(Date.now() / 30000);
      const currentToken = generateTOTP(secret, currentStep);
      
      expect(currentToken).toHaveLength(6);
      expect(/^\d{6}$/.test(currentToken)).toBe(true);

      // Verify the token passes with zero drift
      const isValid = verifyMfaToken(secret, currentToken);
      expect(isValid).toBe(true);
    });

    it('should allow token verification with clock drift support (+/- 30 seconds)', () => {
      const secret = generateMfaSecret();
      const currentStep = Math.floor(Date.now() / 30000);

      // Token generated 1 window (30 seconds) ahead
      const nextToken = generateTOTP(secret, currentStep + 1);
      const isNextValid = verifyMfaToken(secret, nextToken);
      expect(isNextValid).toBe(true);

      // Token generated 1 window (30 seconds) behind
      const prevToken = generateTOTP(secret, currentStep - 1);
      const isPrevValid = verifyMfaToken(secret, prevToken);
      expect(isPrevValid).toBe(true);

      // Invalid tokens should fail
      const isInvalid = verifyMfaToken(secret, '999999');
      expect(isInvalid).toBe(false);
    });
  });

});

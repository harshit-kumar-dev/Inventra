import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Never uses Math.random().
 */
export const generateSecureOTP = (): string => {
  const buffer = crypto.randomBytes(4);
  const randomNumber = buffer.readUInt32BE(0) % 1000000;
  return randomNumber.toString().padStart(6, '0');
};

/**
 * Hashes OTP for safe database storage.
 */
export const hashOTP = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verifies if provided plain OTP matches the stored hash.
 */
export const verifyOTPHash = (otp: string, storedHash: string): boolean => {
  const hash = hashOTP(otp);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
};

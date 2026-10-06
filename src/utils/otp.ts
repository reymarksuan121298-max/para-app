/**
 * OTP (One-Time Password) utilities for email verification.
 */

export const OTP_EXPIRY_MINUTES = 10;

/**
 * Generates a random numeric OTP of the specified length (default 6 digits).
 */
export function generateOtp(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    otp += digits[randomIndex];
  }
  return otp;
}

/**
 * Checks whether an OTP has expired based on creation timestamp and allowed validity in minutes.
 */
export function isOtpExpired(createdAtMs: number, validityMinutes: number = OTP_EXPIRY_MINUTES): boolean {
  const expiryTime = createdAtMs + validityMinutes * 60 * 1000;
  return Date.now() > expiryTime;
}

/**
 * Generates a valid UUID v4 string.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import { prisma, Role } from '../config/db';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { generateSecureOTP, hashOTP, verifyOTPHash } from '../utils/otp';
import { sendPasswordResetEmail } from '../utils/mail';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: {
    name: string;
    loginId: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedLoginId = data.loginId.trim();

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw { statusCode: 409, message: 'A user with this email address already exists.' };
    }

    // Check duplicate loginId
    const existingLoginId = await prisma.user.findUnique({
      where: { loginId: normalizedLoginId },
    });
    if (existingLoginId) {
      throw { statusCode: 409, message: 'This Login ID is already taken. Please choose another.' };
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        loginId: normalizedLoginId,
        email: normalizedEmail,
        passwordHash,
        role: data.role || Role.WAREHOUSE_STAFF,
      },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, token };
  }

  /**
   * Login with email or loginId and password
   */
  static async login(identifier: string, password: string) {
    const normalizedIdentifier = identifier.trim();
    const isEmail = normalizedIdentifier.includes('@');

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: normalizedIdentifier.toLowerCase() }
        : { loginId: normalizedIdentifier },
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid Login ID / Email or Password.' };
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid Login ID / Email or Password.' };
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Request Password Reset OTP via Brevo
   */
  static async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Return generic success to avoid email account enumeration
    if (!user) {
      return { message: 'If this email is registered, a 6-digit reset OTP has been sent.' };
    }

    // Check resend cooldown (60 seconds)
    const recentOTP = await prisma.passwordResetOTP.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOTP) {
      const secondsSinceCreation = (Date.now() - new Date(recentOTP.createdAt).getTime()) / 1000;
      if (secondsSinceCreation < 60) {
        const remainingSeconds = Math.ceil(60 - secondsSinceCreation);
        throw {
          statusCode: 429,
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        };
      }
    }

    // Invalidate previous active OTPs for this user
    await prisma.passwordResetOTP.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate cryptographically secure 6-digit OTP
    const rawOTP = generateSecureOTP();
    const otpHash = hashOTP(rawOTP);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetOTP.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
      },
    });

    // Send through Brevo SMTP
    await sendPasswordResetEmail(user.email, user.name, rawOTP);

    return { message: 'If this email is registered, a 6-digit reset OTP has been sent.' };
  }

  /**
   * Verify Password Reset OTP
   */
  static async verifyOTP(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid or expired OTP.' };
    }

    const otpRecord = await prisma.passwordResetOTP.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw { statusCode: 400, message: 'No active OTP request found. Please request a new one.' };
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw { statusCode: 400, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw {
        statusCode: 429,
        message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.',
      };
    }

    // Verify hash
    const isValid = verifyOTPHash(otp, otpRecord.otpHash);
    if (!isValid) {
      await prisma.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = otpRecord.maxAttempts - (otpRecord.attempts + 1);
      throw {
        statusCode: 400,
        message: `Invalid OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`,
      };
    }

    return { verified: true, message: 'OTP verified successfully.' };
  }

  /**
   * Reset Password after OTP verification
   */
  static async resetPassword(email: string, otp: string, newPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid reset request.' };
    }

    const otpRecord = await prisma.passwordResetOTP.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw { statusCode: 400, message: 'No active OTP found. Please request a new one.' };
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw { statusCode: 400, message: 'OTP has expired. Please request a new one.' };
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw { statusCode: 429, message: 'Maximum attempts exceeded. Please request a new OTP.' };
    }

    const isValid = verifyOTPHash(otp, otpRecord.otpHash);
    if (!isValid) {
      await prisma.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw { statusCode: 400, message: 'Invalid OTP provided.' };
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Atomic transaction: mark OTP consumed and update user password
    await prisma.$transaction([
      prisma.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
    ]);

    return { message: 'Password has been successfully updated. You can now log in.' };
  }

  /**
   * Get Current Authenticated User profile
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        loginId: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'User profile not found.' };
    }

    return user;
  }
}

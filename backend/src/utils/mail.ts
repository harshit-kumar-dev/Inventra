import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

export const createMailTransporter = () => {
  return nodemailer.createTransport({
    host: ENV.BREVO_SMTP_HOST,
    port: ENV.BREVO_SMTP_PORT,
    secure: ENV.BREVO_SMTP_PORT === 465,
    auth: {
      user: ENV.BREVO_SMTP_USER,
      pass: ENV.BREVO_SMTP_PASSWORD,
    },
  });
};

export const sendPasswordResetEmail = async (
  recipientEmail: string,
  recipientName: string,
  otp: string
): Promise<boolean> => {
  try {
    const transporter = createMailTransporter();

    const mailOptions = {
      from: `"${ENV.BREVO_SENDER_NAME}" <${ENV.BREVO_SENDER_EMAIL}>`,
      to: recipientEmail,
      subject: 'StockSense Password Reset OTP',
      text: `Hello ${recipientName},\n\nYour StockSense password reset OTP is:\n\n${otp}\n\nThis OTP expires in 10 minutes and can only be used once.\nIf you did not request a password reset, please ignore this email.\n\n— StockSense Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #0d1117; color: #e6edf3; border-radius: 12px; border: 1px solid #30363d;">
          <h2 style="color: #58a6ff; margin-bottom: 8px;">StockSense</h2>
          <p style="font-size: 14px; color: #8b949e; margin-bottom: 24px;">Smart Inventory Management System</p>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>You requested a password reset for your StockSense account. Use the verification code below:</p>
          <div style="background-color: #161b22; border: 1px solid #238636; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3fb950; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #8b949e;">This code will expire in <strong>10 minutes</strong> and can only be used once.</p>
          <p style="font-size: 13px; color: #8b949e;">If you did not initiate this request, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #21262d; margin: 24px 0;" />
          <p style="font-size: 11px; color: #6e7681; text-align: center;">© ${new Date().getFullYear()} StockSense. All rights reserved.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Password reset email sent to ${recipientEmail}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email via Brevo SMTP to ${recipientEmail}:`, error);
    return false;
  }
};

import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

export const createMailTransporter = () => {
  return nodemailer.createTransport({
    host: ENV.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(ENV.BREVO_SMTP_PORT) || 587,
    secure: Number(ENV.BREVO_SMTP_PORT) === 465,
    auth: {
      user: ENV.BREVO_SMTP_USER,
      pass: ENV.BREVO_SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
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

    const senderEmail = ENV.BREVO_SENDER_EMAIL || 'support@stocksense.internal';
    const senderName = ENV.BREVO_SENDER_NAME || 'StockSense IMS';

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: `[${otp}] Your StockSense Password Reset Code`,
      text: `Hello ${recipientName},\n\nYour StockSense password reset verification code is:\n\n${otp}\n\nThis 6-digit OTP expires in 10 minutes and can only be used once.\nIf you did not request a password reset, please ignore this email.\n\n— StockSense Security Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #F5EFE3; border-radius: 12px; border: 1px solid #D8C9A8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4F5B2A; margin: 0; font-size: 26px; font-weight: 800;">StockSense</h1>
            <p style="font-size: 12px; color: #8C826D; margin-top: 4px; font-weight: 600; letter-spacing: 0.04em;">SMART WAREHOUSE & INVENTORY IMS</p>
          </div>

          <div style="background-color: #FFFFFF; border-radius: 10px; padding: 24px; border: 1px solid #D8C9A8; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="font-size: 18px; color: #1F2414; margin-top: 0;">Password Reset Request</h2>
            <p style="font-size: 14px; color: #4A463D; line-height: 1.5;">Hello <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14px; color: #4A463D; line-height: 1.5;">You requested a password reset for your StockSense account. Enter the 6-digit verification code below to proceed:</p>
            
            <div style="background-color: #F5EFE3; border: 2px dashed #4F5B2A; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #4F5B2A; font-family: monospace; display: inline-block; padding-left: 10px;">${otp}</span>
            </div>

            <p style="font-size: 13px; color: #8C826D; line-height: 1.4;">
              ⏱️ This code will expire in <strong>10 minutes</strong> and is valid for a single use.
            </p>
            <p style="font-size: 13px; color: #8C826D; line-height: 1.4; margin-bottom: 0;">
              If you did not initiate this request, you can safely disregard this message.
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <p style="font-size: 11px; color: #8C826D; margin: 0;">© ${new Date().getFullYear()} StockSense IMS. Secure Authentication Gateway.</p>
          </div>
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

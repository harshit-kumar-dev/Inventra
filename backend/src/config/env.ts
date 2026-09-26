import * as dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'stocksense-jwt-super-secret-key-production-ready-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BREVO_SMTP_HOST: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
  BREVO_SMTP_USER: process.env.BREVO_SMTP_USER || '',
  BREVO_SMTP_PASSWORD: process.env.BREVO_SMTP_PASSWORD || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'notifications@stocksense.app',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'StockSense',
};

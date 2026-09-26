import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useToast } from '../../context/ToastContext';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      setIsSubmitted(true);
      success('6-digit reset code dispatched to your registered email inbox.');
    } catch (err: any) {
      error(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Link
        to="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          textDecoration: 'none',
          marginBottom: '16px',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={14} /> Back to Sign In
      </Link>

      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
        Reset Your Password
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Enter your registered email address to receive a secure 6-digit verification code.
      </p>

      {isSubmitted ? (
        <div
          style={{
            padding: '24px 20px',
            borderRadius: 'var(--radius-md)',
            background: '#F5EFE3',
            border: '1px solid #D8C9A8',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(79, 91, 42, 0.12)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            <CheckCircle2 size={26} />
          </div>

          <p style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '6px' }}>
            Check Your Email Inbox
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
            A 6-digit verification code has been dispatched to <strong>{email}</strong>. Please check your inbox (or Spam/Promotions folder) and enter the code on the next screen.
          </p>

          <button
            onClick={() => navigate('/verify-otp', { state: { email } })}
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '14px', fontWeight: 700 }}
          >
            Enter 6-Digit OTP Code
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Registered Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                placeholder="e.g. user@company.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px', padding: '11px' }}
            disabled={isLoading}
          >
            <Send size={16} />
            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;

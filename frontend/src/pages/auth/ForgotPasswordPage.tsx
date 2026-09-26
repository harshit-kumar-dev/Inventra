import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
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
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
      success('6-digit reset code has been sent via Brevo email.');
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
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--emerald-400)', fontWeight: 600, marginBottom: '8px' }}>
            Check Your Email
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            A 6-digit verification OTP was dispatched to <strong>{email}</strong> via Brevo SMTP.
          </p>
          <button
            onClick={() => navigate('/verify-otp', { state: { email } })}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Proceed to Enter OTP
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
                placeholder="manager@stocksense.com"
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
            {isLoading ? 'Sending OTP...' : 'Send Reset Code'}
          </button>
        </form>
      )}
    </div>
  );
};

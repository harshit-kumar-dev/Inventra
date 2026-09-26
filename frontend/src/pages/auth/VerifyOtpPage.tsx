import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useToast } from '../../context/ToastContext';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultEmail = location.state?.email || '';

  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { success, error } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (otp.length !== 6) {
      setErrorMsg('Please enter a 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verifyOTP({ email, otp });
      success('OTP verified successfully!');
      navigate('/reset-password', { state: { email, otp } });
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired OTP.';
      setErrorMsg(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Link
        to="/forgot-password"
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
        <ArrowLeft size={14} /> Back
      </Link>

      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
        Verify 6-Digit Code
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Enter the OTP code delivered to your registered email.
      </p>

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--status-canceled-bg)',
            border: '1px solid var(--status-canceled-border)',
            color: 'var(--status-canceled-text)',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleVerify}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            required
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">6-Digit Verification Code</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              maxLength={6}
              className="form-input"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{
                letterSpacing: '8px',
                fontSize: '20px',
                fontWeight: 700,
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-primary)',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '12px', padding: '11px' }}
          disabled={isLoading || otp.length !== 6}
        >
          <CheckCircle2 size={16} />
          {isLoading ? 'Verifying...' : 'Verify OTP Code'}
        </button>
      </form>
    </div>
  );
};
export default VerifyOtpPage;

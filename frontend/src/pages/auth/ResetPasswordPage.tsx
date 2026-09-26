import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Key, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useToast } from '../../context/ToastContext';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState(location.state?.otp || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { success, error } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      success('Password successfully reset! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      const msg = err?.message || 'Failed to reset password.';
      setErrorMsg(msg);
      error(msg);
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
        Set New Password
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Create a new strong password for your Inventra account.
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

      <form onSubmit={handleReset}>
        <div className="form-group">
          <label className="form-label">New Password (min 8 chars)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Key size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '12px', padding: '11px' }}
          disabled={isLoading}
        >
          <CheckCircle2 size={16} />
          {isLoading ? 'Updating Password...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
};
export default ResetPasswordPage;

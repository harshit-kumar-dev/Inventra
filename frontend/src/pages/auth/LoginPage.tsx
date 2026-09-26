import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail, User } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('manager1');
  const [password, setPassword] = useState('Password@123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authApi.login({ email: identifier, password });
      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        success(`Welcome back, ${res.data.user.name}!`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err?.message || 'Invalid Login ID / Email or Password';
      setErrorMsg(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to fill demo credentials
  const fillDemo = (loginId: string) => {
    setIdentifier(loginId);
    setPassword('Password@123');
    setErrorMsg('');
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
        Sign In to StockSense
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Enter your credentials to access live warehouse inventory.
      </p>

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--rose-400)',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Login ID or Email</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. manager1 or manager@stocksense.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Password</label>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--primary-400)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Key size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '8px', padding: '11px' }}
          disabled={isLoading}
        >
          <LogIn size={16} />
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      {/* Demo Credentials Quick Switcher */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Demo Logins:</span>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => fillDemo('manager1')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => fillDemo('warehouse1')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => fillDemo('admin123')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Admin
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--primary-400)', textDecoration: 'none', fontWeight: 600 }}>
          Create an Account
        </Link>
      </div>
    </div>
  );
};

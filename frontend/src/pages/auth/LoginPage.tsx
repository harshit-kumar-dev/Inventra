import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail, Shield, Sparkles, UserPlus } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleLoginWithCreds = async (emailOrId: string, pass: string) => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authApi.login({ email: emailOrId, password: pass });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginWithCreds(identifier, password);
  };

  // Quick Auto-Fill credentials into form inputs (does NOT auto-submit)
  const fillCredentials = (emailOrId: string) => {
    setIdentifier(emailOrId);
    setPassword('Password@123');
    setErrorMsg('');
    success(`Loaded demo credentials for ${emailOrId}`);
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
        Sign In to Inventra
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Enter your credentials to access live warehouse inventory.
      </p>

      {/* Quick Auto-Fill Credentials Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(79, 91, 42, 0.08), rgba(184, 137, 45, 0.12))',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#B8892D" /> Quick Fill Demo Credentials:
          </span>
          <span style={{ fontSize: '10px', background: 'var(--color-accent-soft)', color: '#9E7422', border: '1px solid var(--border-accent)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
            Auto-Fill
          </span>
        </div>

        {/* 1-Click Fill Detail Buttons (Fills inputs only) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fillCredentials('admin')}
            className="btn"
            title="Fill Administrator Credentials"
            style={{
              flex: '1 1 auto',
              fontSize: '11.5px',
              padding: '7px 12px',
              background: '#4F5B2A',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 91, 42, 0.3)',
            }}
          >
            <Shield size={12} /> Fill Admin
          </button>

          <button
            type="button"
            onClick={() => fillCredentials('manager1')}
            className="btn"
            title="Fill Manager Credentials"
            style={{
              flex: '1 1 auto',
              fontSize: '11.5px',
              padding: '7px 10px',
              background: '#EDE3CF',
              color: 'var(--color-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fill Manager
          </button>

          <button
            type="button"
            onClick={() => fillCredentials('warehouse1')}
            className="btn"
            title="Fill Staff Credentials"
            style={{
              flex: '1 1 auto',
              fontSize: '11.5px',
              padding: '7px 10px',
              background: '#EDE3CF',
              color: 'var(--color-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fill Staff
          </button>
        </div>
      </div>

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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email Address or Login ID</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. admin@inventra.app or Login ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Password</label>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
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

      {/* Admin Sign Up Section */}
      <div
        style={{
          marginTop: '22px',
          paddingTop: '18px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Need a new Administrator account?
        </span>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            border: '1.5px solid #D8C9A8',
            color: '#4F5B2A',
          }}
        >
          <UserPlus size={15} /> Sign Up as Admin
        </button>
      </div>
    </div>
  );
};
export default LoginPage;

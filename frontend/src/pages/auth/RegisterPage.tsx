import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Key, Shield, ArrowLeft } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Public registration is strictly for System Administrator
  const role = 'ADMIN';
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (loginId.length < 4 || loginId.length > 16) {
      setErrorMsg('Login ID must be between 4 and 16 characters.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        name,
        loginId,
        email,
        password,
        role,
      });

      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        success('Admin account created successfully! Welcome to Inventra.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please verify your details.';
      setErrorMsg(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12.5px',
            color: '#4F5B2A',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Administrator Sign Up
        </h2>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: '#F5EFE3',
            color: '#4F5B2A',
            border: '1px solid #D8C9A8',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ADMIN ONLY
        </span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Register a new System Administrator account with full enterprise access.
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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Login ID (alphanumeric username)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              minLength={4}
              maxLength={16}
              className="form-input"
              placeholder="e.g. admin_hq"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Administrator Work Email</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Locked Role Badge */}
        <div className="form-group">
          <label className="form-label">Assigned Role</label>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#F5EFE3',
              border: '1px solid #D8C9A8',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Shield size={18} color="#4F5B2A" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#4F5B2A' }}>
                System Administrator (ADMIN)
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Staff & Manager accounts are provisioned internally from the User Management console.
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password (min 8 chars)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              required
              minLength={8}
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
          style={{ width: '100%', marginTop: '10px', padding: '11px' }}
          disabled={isLoading}
        >
          <UserPlus size={16} />
          {isLoading ? 'Creating Administrator Account...' : 'Sign Up as Admin'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
};
export default RegisterPage;

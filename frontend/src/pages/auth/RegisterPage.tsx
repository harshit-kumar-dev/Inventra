import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Key, Shield } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('WAREHOUSE_STAFF');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (loginId.length < 6 || loginId.length > 12) {
      setErrorMsg('Login ID must be between 6 and 12 characters.');
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
        success('Account created successfully! Welcome to StockSense.');
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
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
        Create an Account
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Register new warehouse or inventory staff into StockSense.
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
          <label className="form-label">Full Name</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Login ID (6–12 alphanumeric characters)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              minLength={6}
              maxLength={12}
              className="form-input"
              placeholder="e.g. jdoe_staff"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Work Email</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. jdoe@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">System Role</label>
          <div style={{ position: 'relative' }}>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ paddingLeft: '38px' }}
            >
              <option value="WAREHOUSE_STAFF">Warehouse Staff (Transfers, Picking, Shelving)</option>
              <option value="INVENTORY_MANAGER">Inventory Manager (Full Operations & Master Data)</option>
              <option value="ADMIN">System Administrator</option>
            </select>
            <Shield size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password (min 8 chars, 1 uppercase, 1 special)</label>
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
          style={{ width: '100%', marginTop: '10px', padding: '11px' }}
          disabled={isLoading}
        >
          <UserPlus size={16} />
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary-400)', textDecoration: 'none', fontWeight: 600 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
};

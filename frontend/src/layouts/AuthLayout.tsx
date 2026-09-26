import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Boxes } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow elements */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          top: '10%',
          left: '15%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
          bottom: '10%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        {/* Brand Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: '14px',
            }}
          >
            <Boxes size={30} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            StockSense
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Smart Inventory Management System
          </p>
        </div>

        {/* Auth Content Card */}
        <div className="glass-card animate-fade-in" style={{ padding: '32px 28px', border: '1px solid var(--border-medium)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

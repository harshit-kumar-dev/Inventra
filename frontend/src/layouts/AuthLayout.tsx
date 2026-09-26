import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Shield, Sparkles, Box, Layers, ArrowLeftRight } from 'lucide-react';

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
        backgroundColor: '#F5EFE3',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* LEFT COLUMN: Auth Form Area */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          zIndex: 10,
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', maxWidth: '460px' }}>
          {/* Brand Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <img
              src="/logo.jpg"
              alt="StockSense Logo"
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                objectFit: 'cover',
                boxShadow: '0 6px 18px rgba(79, 91, 42, 0.25)',
                border: '2px solid rgba(216, 201, 168, 0.6)',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                }}
              >
                StockSense
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.03em', marginTop: '2px' }}>
                SMART WAREHOUSE & INVENTORY IMS
              </div>
            </div>
          </div>

          {/* Auth Card Content */}
          <div
            className="card animate-fade-in"
            style={{
              padding: '32px 28px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <Outlet />
          </div>

          {/* Footer Security Note */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Shield size={13} color="var(--color-primary)" />
            <span>Encrypted Session • Immutable Double-Entry Ledger Protection</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Illustration & Feature Showcase Area (Desktop only) */}
      <div
        className="auth-hero-pane"
        style={{
          flex: '1 1 50%',
          backgroundColor: '#EDE4D0',
          borderLeft: '1px solid #D8C9A8',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient decorative background orbs */}
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 91, 42, 0.15) 0%, transparent 70%)',
            top: '-5%',
            right: '-5%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(184, 137, 45, 0.15) 0%, transparent 70%)',
            bottom: '-5%',
            left: '-5%',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 5 }}>
          {/* Main Visual Image Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '12px',
              boxShadow: '0 16px 40px rgba(79, 91, 42, 0.18)',
              border: '2px solid rgba(216, 201, 168, 0.8)',
              marginBottom: '26px',
              display: 'inline-block',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            <img
              src="/login-hero.jpg"
              alt="StockSense Smart Warehouse Operations"
              style={{
                width: '100%',
                maxHeight: '340px',
                objectFit: 'cover',
                borderRadius: '12px',
                display: 'block',
              }}
            />
          </div>

          {/* Heading & Value Proposition */}
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '10px',
              lineHeight: 1.25,
            }}
          >
            Intelligent Warehouse & Logistics Control
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '24px',
            }}
          >
            Automate dock receiving, bin-level shelving, internal transfers, order fulfillment, and audit cycle counts in real time.
          </p>

          {/* Key Feature Highlights */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid #D8C9A8',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <span>Real-Time Stock Audit</span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid #D8C9A8',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <ArrowLeftRight size={16} color="#B8892D" style={{ flexShrink: 0 }} />
              <span>Multi-Location Transfers</span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid #D8C9A8',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <Box size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <span>Dock Receiving & Packing</span>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid #D8C9A8',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <Shield size={16} color="#B8892D" style={{ flexShrink: 0 }} />
              <span>Role Access Governance</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .auth-hero-pane {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;

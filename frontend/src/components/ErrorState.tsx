import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Failed to load data from server. Please check your connection.',
  onRetry,
}) => {
  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 24px',
        textAlign: 'center',
        margin: '20px 0',
        borderColor: 'rgba(239, 68, 68, 0.3)',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: 'var(--rose-400)',
        }}
      >
        <AlertTriangle size={26} />
      </div>
      <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--rose-400)', marginBottom: '8px' }}>
        An Error Occurred
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: onRetry ? '20px' : '0' }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary">
          <RefreshCw size={15} />
          Retry Request
        </button>
      )}
    </div>
  );
};

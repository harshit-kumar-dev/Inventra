import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  text?: string;
  message?: string;
  minHeight?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  text,
  message,
  minHeight = '300px',
}) => {
  const displayMsg = text || message || 'Loading inventory data...';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        gap: '12px',
        color: 'var(--text-secondary)',
      }}
    >
      <Loader2 size={32} className="animate-spin" color="var(--primary-400)" />
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{displayMsg}</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
export default LoadingState;

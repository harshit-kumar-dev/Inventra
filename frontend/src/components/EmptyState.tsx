import React from 'react';
import { PackageOpen, Plus, LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode | LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are currently no items matching your criteria.',
  actionText,
  onAction,
  icon,
}) => {
  const renderIcon = () => {
    if (!icon) return <PackageOpen size={28} />;
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent size={28} />;
    }
    return icon as React.ReactNode;
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        margin: '20px 0',
        background: '#FFFFFF',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--color-surface-tint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: 'var(--color-primary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {renderIcon()}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: onAction ? '20px' : '0' }}>
        {description}
      </p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          <Plus size={16} />
          {actionText}
        </button>
      )}
    </div>
  );
};
export default EmptyState;

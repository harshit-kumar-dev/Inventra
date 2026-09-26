import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth,
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let computedMaxWidth = maxWidth || '620px';
  if (!maxWidth) {
    if (size === 'sm') computedMaxWidth = '420px';
    if (size === 'md') computedMaxWidth = '580px';
    if (size === 'lg') computedMaxWidth = '800px';
    if (size === 'xl') computedMaxWidth = '1020px';
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: computedMaxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
export default Modal;

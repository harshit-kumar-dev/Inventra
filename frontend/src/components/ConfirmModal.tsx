import React from 'react';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'success';
  variant?: 'primary' | 'danger' | 'success';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type,
  variant = 'primary',
  isLoading = false,
}) => {
  const chosenType = type || variant || 'primary';
  let btnClass = 'btn-primary';
  if (chosenType === 'danger') btnClass = 'btn-danger';
  if (chosenType === 'success') btnClass = 'btn-success';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="480px">
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div
          style={{
            padding: '10px',
            borderRadius: '50%',
            background: chosenType === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            color: chosenType === 'danger' ? 'var(--rose-400)' : 'var(--primary-400)',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={24} />
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
          {cancelText}
        </button>
        <button type="button" onClick={onConfirm} className={`btn ${btnClass}`} disabled={isLoading}>
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};
export default ConfirmModal;

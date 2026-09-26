import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface StatusBadgeProps {
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED' | 'IN' | 'OUT' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const upper = (status || '').toUpperCase();
  const fontSize = size === 'sm' ? '11px' : '12px';
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';

  switch (upper) {
    case 'DRAFT':
      return (
        <span className="badge badge-draft" style={{ fontSize, padding }}>
          <Clock size={12} />
          Draft
        </span>
      );
    case 'WAITING':
      return (
        <span className="badge badge-waiting" style={{ fontSize, padding }}>
          <AlertCircle size={12} />
          Waiting
        </span>
      );
    case 'READY':
      return (
        <span className="badge badge-ready" style={{ fontSize, padding }}>
          <Clock size={12} />
          Ready
        </span>
      );
    case 'DONE':
      return (
        <span className="badge badge-done" style={{ fontSize, padding }}>
          <CheckCircle size={12} />
          Done
        </span>
      );
    case 'CANCELED':
      return (
        <span className="badge badge-canceled" style={{ fontSize, padding }}>
          <XCircle size={12} />
          Canceled
        </span>
      );
    case 'IN':
    case 'RECEIPT':
    case 'TRANSFER_IN':
      return (
        <span className="badge badge-in" style={{ fontSize, padding }}>
          <ArrowDownLeft size={12} />
          IN
        </span>
      );
    case 'OUT':
    case 'DELIVERY':
    case 'TRANSFER_OUT':
      return (
        <span className="badge badge-out" style={{ fontSize, padding }}>
          <ArrowUpRight size={12} />
          OUT
        </span>
      );
    case 'ADJUSTMENT':
      return (
        <span className="badge badge-waiting" style={{ fontSize, padding }}>
          Adjust
        </span>
      );
    default:
      return (
        <span className="badge badge-draft" style={{ fontSize, padding }}>
          {status}
        </span>
      );
  }
};

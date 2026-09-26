import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, NotificationItem } from '../services/dashboardApi';

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const res = await dashboardApi.getNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (e) {
      console.warn('Failed to load notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await dashboardApi.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await dashboardApi.markNotificationRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left side: System status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--emerald-400)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--emerald-400)',
              boxShadow: '0 0 8px var(--emerald-400)',
            }}
          />
          Live Production Engine
        </div>
      </div>

      {/* Right side: Notifications & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Notification Bell with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--rose-500)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div
              className="glass-card animate-fade-in"
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '360px',
                maxHeight: '440px',
                overflowY: 'auto',
                padding: '16px',
                zIndex: 100,
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-400)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No new notifications
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkOneRead(n.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: n.readAt ? 'rgba(255, 255, 255, 0.02)' : 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid',
                        borderColor: n.readAt ? 'transparent' : 'rgba(59, 130, 246, 0.2)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {n.title}
                        </span>
                        {!n.readAt && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-400)' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {n.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-500), #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              color: '#fff',
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {user?.name || 'Authorized User'}
          </span>
        </div>
      </div>
    </header>
  );
};

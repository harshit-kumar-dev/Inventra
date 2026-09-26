import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Building2,
  Users,
  Tags,
  User,
  LogOut,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    info('You have been logged out.');
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `nav-item ${isActive ? 'nav-item-active' : ''}`;

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <Boxes size={22} />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: '#fff' }}>
            StockSense
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Smart Inventory IMS
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <div className="nav-section-title">MAIN</div>
        <NavLink to="/dashboard" className={navItemClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/products" className={navItemClass}>
          <Package size={18} />
          <span>Products Catalog</span>
        </NavLink>

        <div className="nav-section-title" style={{ marginTop: '20px' }}>OPERATIONS</div>
        <NavLink to="/receipts" className={navItemClass}>
          <ArrowDownLeft size={18} color="var(--emerald-400)" />
          <span>Receipts</span>
        </NavLink>
        <NavLink to="/deliveries" className={navItemClass}>
          <ArrowUpRight size={18} color="var(--rose-400)" />
          <span>Delivery Orders</span>
        </NavLink>
        <NavLink to="/transfers" className={navItemClass}>
          <ArrowLeftRight size={18} color="var(--primary-400)" />
          <span>Internal Transfers</span>
        </NavLink>
        <NavLink to="/adjustments" className={navItemClass}>
          <SlidersHorizontal size={18} color="var(--amber-400)" />
          <span>Adjustments</span>
        </NavLink>
        <NavLink to="/move-history" className={navItemClass}>
          <History size={18} color="var(--cyan-400)" />
          <span>Move History</span>
        </NavLink>

        <div className="nav-section-title" style={{ marginTop: '20px' }}>SETTINGS & MASTER</div>
        <NavLink to="/warehouse" className={navItemClass}>
          <Building2 size={18} />
          <span>Warehouses</span>
        </NavLink>
        <NavLink to="/suppliers" className={navItemClass}>
          <Users size={18} />
          <span>Suppliers</span>
        </NavLink>
        <NavLink to="/categories" className={navItemClass}>
          <Tags size={18} />
          <span>Categories</span>
        </NavLink>
      </div>

      {/* Profile & Logout Footer */}
      <div
        style={{
          padding: '16px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <NavLink to="/profile" className={navItemClass}>
          <User size={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User Profile'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user?.role?.replace('_', ' ') || 'Warehouse Staff'}
            </div>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--rose-400)', marginTop: '4px' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>

      <style>{`
        .nav-section-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          padding: 6px 12px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
          margin-bottom: 3px;
          cursor: pointer;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
        .nav-item-active {
          background: rgba(59, 130, 246, 0.15) !important;
          color: var(--primary-400) !important;
          font-weight: 600;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }
      `}</style>
    </aside>
  );
};

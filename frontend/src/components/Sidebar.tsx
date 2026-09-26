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
  UserCog,
  Tags,
  User,
  LogOut,
  Boxes,
  Truck,
  Settings,
  MapPin,
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

  const isStaff = user?.role === 'WAREHOUSE_STAFF';
  const isManagerOrAdmin = user?.role === 'INVENTORY_MANAGER' || user?.role === 'ADMIN';

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#4F5B2A',
        borderRight: '1px solid rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        color: '#F5EFE3',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(245, 239, 227, 0.12)',
        }}
      >
        <img
          src="/logo.jpg"
          alt="StockSense Logo"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(216, 201, 168, 0.4)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          }}
        />
        <div>
          <div
            style={{
              fontSize: '19px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            StockSense
          </div>
          <div style={{ fontSize: '11px', color: '#D8C9A8', fontWeight: 600, letterSpacing: '0.04em' }}>
            SMART WAREHOUSE IMS
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <div className="nav-section-title">OVERVIEW</div>
        <NavLink to="/dashboard" className={navItemClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/stock" className={navItemClass}>
          <Boxes size={18} />
          <span>Stock Inventory</span>
        </NavLink>
        <NavLink to="/products" className={navItemClass}>
          <Package size={18} />
          <span>Products Catalog</span>
        </NavLink>

        {/* Section for Inventory Managers (Incoming & Outgoing Stock) */}
        {isManagerOrAdmin && (
          <>
            <div className="nav-section-title" style={{ marginTop: '20px' }}>
              INCOMING & OUTGOING STOCK
            </div>
            <NavLink to="/receipts" className={navItemClass}>
              <ArrowDownLeft size={18} />
              <span>Incoming Receipts</span>
            </NavLink>
            <NavLink to="/deliveries" className={navItemClass}>
              <ArrowUpRight size={18} />
              <span>Outgoing Deliveries</span>
            </NavLink>
            <NavLink to="/move-history" className={navItemClass}>
              <History size={18} />
              <span>Stock Ledger & Audit</span>
            </NavLink>

            <div className="nav-section-title" style={{ marginTop: '20px' }}>
              INTERNAL & RECONCILIATION
            </div>
            <NavLink to="/transfers" className={navItemClass}>
              <ArrowLeftRight size={18} />
              <span>Internal Transfers</span>
            </NavLink>
            <NavLink to="/adjustments" className={navItemClass}>
              <SlidersHorizontal size={18} />
              <span>Stock Adjustments</span>
            </NavLink>
          </>
        )}

        {/* Section for Warehouse Staff (Transfers, Picking, Shelving & Counting) */}
        {isStaff && (
          <>
            <div className="nav-section-title" style={{ marginTop: '20px' }}>
              FLOOR OPERATIONS
            </div>
            <NavLink to="/transfers" className={navItemClass}>
              <ArrowLeftRight size={18} />
              <span>Transfers & Shelving</span>
            </NavLink>
            <NavLink to="/deliveries" className={navItemClass}>
              <ArrowUpRight size={18} />
              <span>Order Picking (Outbound)</span>
            </NavLink>
            <NavLink to="/adjustments" className={navItemClass}>
              <SlidersHorizontal size={18} />
              <span>Physical Counts (Cycle)</span>
            </NavLink>
            <NavLink to="/receipts" className={navItemClass}>
              <ArrowDownLeft size={18} />
              <span>Receiving Dock (Draft)</span>
            </NavLink>
            <NavLink to="/move-history" className={navItemClass}>
              <History size={18} />
              <span>Movement History</span>
            </NavLink>
          </>
        )}

        {/* Master Catalog & Settings Section - STRICTLY PROTECTED FOR ADMIN & INVENTORY_MANAGER ONLY */}
        {isManagerOrAdmin && (
          <>
            <div className="nav-section-title" style={{ marginTop: '20px' }}>
              SETTINGS & MASTER
            </div>
            <NavLink to="/settings" end className={navItemClass}>
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
            <NavLink to="/settings/warehouse" className={navItemClass}>
              <Building2 size={18} />
              <span>Warehouse</span>
            </NavLink>
            <NavLink to="/settings/locations" className={navItemClass}>
              <MapPin size={18} />
              <span>Locations</span>
            </NavLink>
            <NavLink to="/suppliers" className={navItemClass}>
              <Truck size={18} />
              <span>Suppliers</span>
            </NavLink>
            <NavLink to="/categories" className={navItemClass}>
              <Tags size={18} />
              <span>Categories</span>
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/users" className={navItemClass}>
                <UserCog size={18} />
                <span>User Management</span>
              </NavLink>
            )}
          </>
        )}
      </div>

      {/* Profile & Logout Footer */}
      <div
        style={{
          padding: '16px 12px',
          borderTop: '1px solid rgba(245, 239, 227, 0.12)',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <NavLink to="/profile" className={navItemClass}>
          <User size={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'User Profile'}
            </div>
            <div style={{ fontSize: '11px', color: '#D8C9A8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.role === 'INVENTORY_MANAGER'
                ? 'Inventory Manager'
                : user?.role === 'ADMIN'
                ? 'System Admin'
                : 'Warehouse Staff'}
            </div>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          type="button"
          className="nav-item nav-item-logout"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#F5EAE8',
            marginTop: '4px',
            cursor: 'pointer',
          }}
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
          color: #D8C9A8;
          padding: 6px 12px;
          opacity: 0.85;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          color: #EFE6D5;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
          margin-bottom: 3px;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
        }
        .nav-item-active {
          background: #B8892D !important;
          color: #FFFFFF !important;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }
        .nav-item-logout:hover {
          background: rgba(142, 57, 46, 0.3) !important;
          color: #FFFFFF !important;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;

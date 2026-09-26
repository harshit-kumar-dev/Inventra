import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, DashboardSummary } from '../../services/dashboardApi';
import { stockApi, StockLedgerEntry } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import {
  Boxes,
  AlertTriangle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentMoves, setRecentMoves] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, lowRes, ledgerRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getLowStock(1, 6),
        stockApi.getLedgerHistory({ limit: 6 }),
      ]);

      if (sumRes.data) {
        setSummary(sumRes.data);
      }
      if (lowRes.data?.products) {
        setLowStockItems(lowRes.data.products);
      }
      const list = (ledgerRes.data as any)?.ledger || ledgerRes.data?.entries || [];
      setRecentMoves(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard KPIs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Aggregating live inventory metrics & KPI analytics..." />;
  if (error || !summary) return <ErrorState message={error || 'Failed to fetch dashboard data'} onRetry={loadDashboardData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Welcome & Quick Actions Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '24px 28px',
          background: '#FFFFFF',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                boxShadow: '0 0 8px rgba(79, 91, 42, 0.4)',
              }}
            />
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              StockSense Control Hub
            </h1>
            {user?.role && (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface-tint)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                {user.role === 'ADMIN'
                  ? 'System Admin'
                  : user.role === 'INVENTORY_MANAGER'
                  ? 'Inventory Manager'
                  : 'Warehouse Staff'}
              </span>
            )}
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {user?.role === 'WAREHOUSE_STAFF'
              ? 'Operational floor metrics, draft movement staging, and stock levels across active facilities.'
              : 'Real-time multi-warehouse inventory health, movement velocity, and fulfillment pipelines.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadDashboardData}
            className="btn btn-secondary"
            style={{ padding: '8px 12px' }}
            title="Refresh KPIs"
          >
            <RefreshCw size={15} />
          </button>

          {user?.role === 'WAREHOUSE_STAFF' ? (
            <>
              <Link
                to="/transfers/new"
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <Plus size={15} /> New Transfer (Shelving)
              </Link>

              <Link
                to="/deliveries"
                className="btn btn-accent"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <ArrowUpRight size={15} /> Order Picking
              </Link>

              <Link
                to="/adjustments/new"
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <Plus size={15} /> Cycle Count
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/receipts/new"
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <Plus size={15} /> Incoming Receipt
              </Link>

              <Link
                to="/deliveries/new"
                className="btn btn-accent"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <Plus size={15} /> Outgoing Delivery
              </Link>

              <Link
                to="/transfers/new"
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <Plus size={15} /> Transfer
              </Link>

              <Link
                to="/adjustments/new"
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <Plus size={15} /> Adjustment
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 6 Real KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Products in Stock */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In-Stock SKUs
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Boxes size={18} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.inventory.totalProductsInStock}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              of {summary.inventory.totalActiveProducts} active products
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <Link
          to="/products"
          className="card"
          style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9E7422', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Low Stock
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
              {summary.inventory.lowStockCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Below threshold limit
            </div>
          </div>
        </Link>

        {/* Out of Stock Items */}
        <Link
          to="/products"
          className="card"
          style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-canceled-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Out of Stock
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--status-canceled-bg)',
                color: 'var(--status-canceled-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--status-canceled-text)', fontFamily: 'var(--font-mono)' }}>
              {summary.inventory.outOfStockCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Zero inventory balance
            </div>
          </div>
        </Link>

        {/* Pending Receipts */}
        <Link
          to="/receipts"
          className="card"
          style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Receipts
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.receipts.pending}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.receipts.late > 0 ? (
                <span style={{ color: 'var(--status-canceled-text)', fontWeight: 600 }}>{summary.receipts.late} delayed</span>
              ) : (
                'On schedule'
              )}
            </div>
          </div>
        </Link>

        {/* Pending Deliveries */}
        <Link
          to="/deliveries"
          className="card"
          style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9E7422', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Deliveries
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#9E7422', fontFamily: 'var(--font-mono)' }}>
              {summary.deliveries.pending}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.deliveries.waiting > 0 ? `${summary.deliveries.waiting} waiting stock` : 'Ready to dispatch'}
            </div>
          </div>
        </Link>

        {/* Transfers Scheduled */}
        <Link
          to="/transfers"
          className="card"
          style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Transfers Active
            </span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#EDE3CF',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeftRight size={18} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.transfers.scheduled}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Internal bin movements
            </div>
          </div>
        </Link>
      </div>

      {/* Main Grid: Low Stock Alert Section + Recent Movements Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Low Stock Alert Panel */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FAF8F5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#B8892D" />
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Critical Low Stock Warnings
                </h2>
              </div>
              <Link to="/products" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                View catalog &rarr;
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ShieldCheck size={36} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
                <span>All inventory items are currently above their reorder safety thresholds.</span>
              </div>
            ) : (
              <div>
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/products/${item.id}`)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        SKU: {item.sku} &bull; Category: {item.category?.name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-canceled-text)' }}>
                        {item.totalStock} {item.uom?.symbol}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Min: {item.reorderLevel} {item.uom?.symbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '12px 20px', background: '#FAF8F5', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <Link to="/receipts/new" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
              + Generate Purchase Receipt for Depleted Items
            </Link>
          </div>
        </div>

        {/* Recent Ledger Audit Trail */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FAF8F5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--color-primary)" />
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Live Stock Velocity & Moves
                </h2>
              </div>
              <Link to="/move-history" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Full ledger &rarr;
              </Link>
            </div>

            {recentMoves.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent stock movements recorded yet.
              </div>
            ) : (
              <div>
                {recentMoves.map((move) => {
                  const isPositive = move.quantity > 0;
                  return (
                    <div
                      key={move.id}
                      style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12.5px',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StatusBadge status={move.operationType} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{move.product?.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                            {move.location ? `${move.location.warehouse.code} / ${move.location.name}` : '-'} &bull;{' '}
                            {new Date(move.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '14px',
                          color: isPositive ? 'var(--color-primary)' : 'var(--status-canceled-text)',
                        }}
                      >
                        {isPositive ? `+${move.quantity}` : move.quantity}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: '12px 20px', background: '#FAF8F5', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <Link to="/move-history" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
              View Complete Ledger Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { operationApi, Delivery } from '../../services/operationApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ArrowUpRight, Plus, Search, Filter, Calendar, Building2, User, ChevronRight } from 'lucide-react';

export const DeliveryListPage: React.FC = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadDeliveries();
  }, [status, warehouseId]);

  const loadFilterOptions = async () => {
    try {
      const whRes = await warehouseApi.getWarehouses();
      setWarehouses(whRes.data?.warehouses || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getDeliveries({
        search: search.trim() || undefined,
        status: status || undefined,
        warehouseId: warehouseId || undefined,
      });
      setDeliveries(res.data?.deliveries || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDeliveries();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
            <ArrowUpRight size={28} color="#B8892D" /> Outbound Delivery Orders
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Pick, pack, and fulfill outgoing shipments to customers with zero-floor stock safety
          </p>
        </div>
        <Link
          to="/deliveries/new"
          className="btn btn-accent"
        >
          <Plus size={16} /> New Delivery Order
        </Link>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, ref number..."
            className="form-input"
            style={{ paddingLeft: '38px' }}
          />
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <Filter size={14} /> Filters:
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-select"
            style={{ width: 'auto', fontSize: '13px' }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="WAITING">WAITING</option>
            <option value="READY">READY</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
          </select>

          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="form-select"
            style={{ width: 'auto', fontSize: '13px' }}
          >
            <option value="">All Source Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingState text="Loading delivery orders..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDeliveries} />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={ArrowUpRight}
          title="No Delivery Orders Found"
          description={search || status ? "No deliveries match your current filters." : "Create a delivery order to fulfill customer requests."}
          actionText="Create Delivery Order"
          onAction={() => navigate('/deliveries/new')}
        />
      ) : (
        <div className="table-container animate-fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer Name</th>
                <th>Source Warehouse</th>
                <th>Scheduled Date</th>
                <th>Lines / Qty</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/deliveries/${d.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#B8892D', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B8892D' }} />
                      {d.referenceNo}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--text-muted)" />
                      {d.customerName}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Building2 size={14} color="var(--color-primary)" />
                      {d.warehouse?.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({d.warehouse?.code})</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      {new Date(d.scheduleDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.lines?.length || 0}</span> items
                    {d.hasShortage && (
                      <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', background: 'var(--status-canceled-bg)', color: 'var(--status-canceled-text)', fontSize: '10px', fontWeight: 700 }}>
                        Shortage
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default DeliveryListPage;

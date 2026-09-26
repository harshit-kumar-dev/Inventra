import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { operationApi, StockAdjustment } from '../../services/operationApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Scale, Plus, Search, Filter, Building2, MapPin, ChevronRight } from 'lucide-react';

export const AdjustmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
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
    loadAdjustments();
  }, [status, warehouseId]);

  const loadFilterOptions = async () => {
    try {
      const whRes = await warehouseApi.getWarehouses();
      setWarehouses(whRes.data?.warehouses || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdjustments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getAdjustments({
        search: search.trim() || undefined,
        status: status || undefined,
        warehouseId: warehouseId || undefined,
      });
      setAdjustments(res.data?.adjustments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory adjustments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAdjustments();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
            <Scale size={28} color="#B8892D" /> Physical Stock Adjustments
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Reconcile physical inventory counts against recorded system balances with audit trails
          </p>
        </div>
        <Link
          to="/adjustments/new"
          className="btn btn-accent"
        >
          <Plus size={16} /> New Count / Adjustment
        </Link>
      </div>

      {/* Filters */}
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
            placeholder="Search reason, ref number..."
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
            <option value="">All Warehouses</option>
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
        <LoadingState text="Loading adjustment reconciliations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAdjustments} />
      ) : adjustments.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No Stock Adjustments Found"
          description={search || status ? "No adjustments match your current criteria." : "Start a physical cycle count to reconcile stock variances."}
          actionText="Create Stock Count"
          onAction={() => navigate('/adjustments/new')}
        />
      ) : (
        <div className="table-container animate-fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Facility & Bin</th>
                <th>Reason / Justification</th>
                <th>Lines Count</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj) => (
                <tr
                  key={adj.id}
                  onClick={() => navigate(`/adjustments/${adj.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#B8892D', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B8892D' }} />
                      {adj.referenceNo}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={14} color="var(--color-primary)" />
                      {adj.warehouse?.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={12} color="var(--text-muted)" />
                      {adj.location?.name} ({adj.location?.code})
                    </div>
                  </td>
                  <td style={{ fontSize: '12.5px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-accent-soft)', color: '#9E7422', fontWeight: 600 }}>
                      {adj.reason}
                    </span>
                    {adj.notes && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adj.notes}</p>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{adj.lines?.length || 0}</span> items reconciled
                  </td>
                  <td>
                    <StatusBadge status={adj.status} />
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
export default AdjustmentListPage;

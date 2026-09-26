import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { operationApi, InternalTransfer } from '../../services/operationApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ArrowLeftRight, Plus, Search, Filter, Calendar, Building2, ChevronRight } from 'lucide-react';

export const TransferListPage: React.FC = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [status, sourceWarehouseId]);

  const loadFilterOptions = async () => {
    try {
      const whRes = await warehouseApi.getWarehouses();
      setWarehouses(whRes.data?.warehouses || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getTransfers({
        search: search.trim() || undefined,
        status: status || undefined,
        sourceWarehouseId: sourceWarehouseId || undefined,
      });
      setTransfers(res.data?.transfers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch internal transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransfers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
            <ArrowLeftRight size={28} color="var(--color-primary)" /> Internal Stock Transfers
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Shift inventory between facilities and internal bins with atomic double-entry ledger tracking
          </p>
        </div>
        <Link
          to="/transfers/new"
          className="btn btn-primary"
        >
          <Plus size={16} /> New Transfer
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
            placeholder="Search transfer ref..."
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
            value={sourceWarehouseId}
            onChange={(e) => setSourceWarehouseId(e.target.value)}
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
        <LoadingState text="Loading transfer logs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTransfers} />
      ) : transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No Internal Transfers Found"
          description={search || status ? "No transfer orders match your filters." : "Initiate an internal stock movement to relocate inventory."}
          actionText="Create Stock Transfer"
          onAction={() => navigate('/transfers/new')}
        />
      ) : (
        <div className="table-container animate-fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Origin Facility</th>
                <th>Destination Facility</th>
                <th>Transfer Date</th>
                <th>Total Quantity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/transfers/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                      {t.referenceNo}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      {t.sourceWarehouse?.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Building2 size={14} color="var(--color-primary)" />
                      {t.destinationWarehouse?.name}
                    </div>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      {new Date(t.scheduleDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.lines?.length || 0}</span> lines
                    {t.totalQuantity !== undefined && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({t.totalQuantity} units)</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
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
export default TransferListPage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { operationApi, Receipt } from '../../services/operationApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { supplierApi, Supplier } from '../../services/supplierApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ArrowDownLeft, Plus, Search, Filter, Calendar, Building2, Truck, ChevronRight } from 'lucide-react';

export const ReceiptListPage: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [status, warehouseId, supplierId]);

  const loadFilterOptions = async () => {
    try {
      const [whRes, supRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        supplierApi.getSuppliers(),
      ]);
      setWarehouses(whRes.data?.warehouses || []);
      setSuppliers(supRes.data?.suppliers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operationApi.getReceipts({
        search: search.trim() || undefined,
        status: status || undefined,
        warehouseId: warehouseId || undefined,
        supplierId: supplierId || undefined,
      });
      setReceipts(res.data?.receipts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch receipt orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReceipts();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
            <ArrowDownLeft size={28} color="var(--color-primary)" /> Incoming Goods Receipts
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Receive incoming vendor shipments, verify product lines, and increase warehouse stock
          </p>
        </div>
        <Link
          to="/receipts/new"
          className="btn btn-primary"
        >
          <Plus size={16} /> New Receipt
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
            placeholder="Search by ref number, notes..."
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

          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="form-select"
            style={{ width: 'auto', fontSize: '13px' }}
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table / Content */}
      {loading ? (
        <LoadingState text="Loading receipt transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReceipts} />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={ArrowDownLeft}
          title="No Receipts Found"
          description={search || status ? "Try adjusting your filters to find existing receipts." : "Create your first incoming receipt order to record arriving inventory."}
          actionText="Create Inbound Receipt"
          onAction={() => navigate('/receipts/new')}
        />
      ) : (
        <div className="table-container animate-fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Vendor / Supplier</th>
                <th>Destination Warehouse</th>
                <th>Scheduled Date</th>
                <th>Items / Total Qty</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/receipts/${r.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                      {r.referenceNo}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={14} color="var(--text-muted)" />
                      {r.supplier?.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Building2 size={14} color="var(--color-primary)" />
                      {r.warehouse?.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({r.warehouse?.code})</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      {new Date(r.scheduleDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.lines?.length || 0}</span> lines
                    {r.totalQuantity !== undefined && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({r.totalQuantity} units)</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
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
export default ReceiptListPage;

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { stockApi, StockLedgerEntry } from '../../services/stockApi';
import { warehouseApi, Warehouse } from '../../services/warehouseApi';
import { productApi, Product } from '../../services/productApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import {
  History,
  Search,
  Filter,
  List,
  LayoutGrid,
  Download,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Building2,
  Package,
  Layers,
  CheckCircle2,
  ExternalLink,
  X,
  RotateCcw,
} from 'lucide-react';

export const MoveHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialProductId = searchParams.get('productId') || '';

  // Data States
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'list' (Table) or 'kanban'
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [operationType, setOperationType] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [productId, setProductId] = useState<string>(initialProductId);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal State
  const [selectedEntry, setSelectedEntry] = useState<StockLedgerEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadLedger();
  }, [operationType, warehouseId, productId, startDate, endDate, page, limit]);

  const loadMasterData = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        warehouseApi.getWarehouses(),
        productApi.getProducts({ limit: 100 }),
      ]);
      setWarehouses(whRes.data?.warehouses || []);
      setProducts(prodRes.data?.products || []);
    } catch (e) {
      console.error('Failed to load master filters', e);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await stockApi.getLedgerHistory({
        operationType: operationType ? (operationType as any) : undefined,
        warehouseId: warehouseId || undefined,
        productId: productId || undefined,
        page,
        limit,
      });

      const list = res.data?.ledger || res.data?.entries || [];
      setEntries(list);
      const meta = res.meta || (res.data as any)?.pagination;
      if (meta) {
        setTotalPages(meta.totalPages || 1);
        setTotalCount(meta.total || list.length);
      } else {
        setTotalCount(list.length);
        setTotalPages(Math.ceil(list.length / limit) || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory movement ledger');
    } finally {
      setLoading(false);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setOperationType('');
    setWarehouseId('');
    setProductId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const activeFilterCount = [
    operationType,
    warehouseId,
    productId,
    startDate,
    endDate,
  ].filter(Boolean).length;

  // Filter entries client-side by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((e) => {
      const ref = (e.referenceNumber || e.referenceId || '').toLowerCase();
      const pName = (e.productName || e.product?.name || '').toLowerCase();
      const sku = (e.sku || e.product?.sku || '').toLowerCase();
      const loc = (e.locationName || e.location?.name || e.locationCode || '').toLowerCase();
      const wh = (e.warehouseName || e.location?.warehouse?.name || '').toLowerCase();
      const op = e.operationType.toLowerCase();
      const user = (e.createdBy || e.user?.name || '').toLowerCase();

      return (
        ref.includes(q) ||
        pName.includes(q) ||
        sku.includes(q) ||
        loc.includes(q) ||
        wh.includes(q) ||
        op.includes(q) ||
        user.includes(q)
      );
    });
  }, [entries, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;
    const headers = [
      'Reference',
      'Operation Type',
      'Product Name',
      'SKU',
      'Quantity Delta',
      'Balance After',
      'Warehouse',
      'Location',
      'Responsible User',
      'Timestamp',
    ];
    const rows = filteredEntries.map((e) => [
      `"${e.referenceNumber || e.referenceId || 'N/A'}"`,
      e.operationType,
      `"${e.productName || e.product?.name || ''}"`,
      e.sku || e.product?.sku || '',
      e.quantity,
      e.balanceAfter !== undefined ? e.balanceAfter : '',
      `"${e.warehouseName || e.location?.warehouse?.name || ''}"`,
      `"${e.locationName || e.location?.name || ''}"`,
      `"${e.createdBy || e.user?.name || 'System'}"`,
      new Date(e.createdAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventra_MoveHistory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Helper functions for From/To display based on real operation type
  const getMovementRouting = (e: StockLedgerEntry) => {
    const wh = e.warehouseName || e.location?.warehouse?.name || 'Main WH';
    const loc = e.locationName || e.location?.name || e.locationCode || 'Stock Bin';
    const whLoc = `${wh} / ${loc}`;

    switch (e.operationType) {
      case 'RECEIPT':
        return {
          from: 'Vendor / Inbound Partner',
          to: whLoc,
          direction: 'inbound',
        };
      case 'DELIVERY':
        return {
          from: whLoc,
          to: 'Customer / Outbound',
          direction: 'outbound',
        };
      case 'TRANSFER_IN':
        return {
          from: 'Origin Location (Transit)',
          to: whLoc,
          direction: 'transfer',
        };
      case 'TRANSFER_OUT':
        return {
          from: whLoc,
          to: 'Destination Location (Transit)',
          direction: 'transfer',
        };
      case 'ADJUSTMENT_GAIN':
        return {
          from: 'Physical Count Surplus',
          to: whLoc,
          direction: 'adjustment',
        };
      case 'ADJUSTMENT_LOSS':
        return {
          from: whLoc,
          to: 'Physical Shrinkage / Loss',
          direction: 'adjustment',
        };
      case 'INITIAL_SEED':
      default:
        return {
          from: 'Opening Balance',
          to: whLoc,
          direction: 'inbound',
        };
    }
  };

  const getOperationBadge = (opType: string) => {
    switch (opType) {
      case 'RECEIPT':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'rgba(79, 91, 42, 0.12)',
              color: '#4F5B2A',
              border: '1px solid rgba(79, 91, 42, 0.25)',
            }}
          >
            <ArrowDownLeft size={13} />
            Receipt
          </span>
        );
      case 'DELIVERY':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'rgba(184, 137, 45, 0.14)',
              color: '#B8892D',
              border: '1px solid rgba(184, 137, 45, 0.3)',
            }}
          >
            <ArrowUpRight size={13} />
            Delivery
          </span>
        );
      case 'TRANSFER_IN':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#2563EB',
              border: '1px solid rgba(59, 130, 246, 0.25)',
            }}
          >
            <ArrowLeftRight size={13} />
            Transfer In
          </span>
        );
      case 'TRANSFER_OUT':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#4F46E5',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <ArrowLeftRight size={13} />
            Transfer Out
          </span>
        );
      case 'ADJUSTMENT_GAIN':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <SlidersHorizontal size={13} />
            Audit Gain
          </span>
        );
      case 'ADJUSTMENT_LOSS':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#DC2626',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <SlidersHorizontal size={13} />
            Audit Loss
          </span>
        );
      case 'INITIAL_SEED':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: '#EBE3D3',
              color: 'var(--text-secondary)',
              border: '1px solid #D8C9A8',
            }}
          >
            <Package size={13} />
            Initial
          </span>
        );
    }
  };

  const handleRowClick = (entry: StockLedgerEntry) => {
    setSelectedEntry(entry);
    setDetailModalOpen(true);
  };

  const navigateToSourceDocument = (e: StockLedgerEntry) => {
    const ref = e.referenceNumber || e.referenceId;
    if (!ref) return;

    if (e.operationType === 'RECEIPT') {
      navigate(`/receipts/${ref}`);
    } else if (e.operationType === 'DELIVERY') {
      navigate(`/deliveries/${ref}`);
    } else if (e.operationType === 'TRANSFER_IN' || e.operationType === 'TRANSFER_OUT') {
      navigate(`/transfers/${ref}`);
    } else if (e.operationType === 'ADJUSTMENT_GAIN' || e.operationType === 'ADJUSTMENT_LOSS') {
      navigate(`/adjustments/${ref}`);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <History size={28} color="var(--color-primary)" />
            Move History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Centralized inventory movement audit trail detailing stock movements, warehouse transfers, receipts, and cycle adjustments.
          </p>
        </div>

        {/* Action Controls: Export CSV */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            disabled={filteredEntries.length === 0}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              borderColor: 'var(--border-medium)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filter Toggle, View Switcher */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Left Side: Search Bar */}
        <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '520px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by reference, product, SKU, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', height: '40px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Right Side: Filter Toggle & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Filter Panel Toggle Button */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              height: '40px',
              backgroundColor: showFilterPanel || activeFilterCount > 0 ? '#F5EFE3' : '#FFFFFF',
              borderColor: activeFilterCount > 0 ? 'var(--color-primary)' : 'var(--border-medium)',
              color: activeFilterCount > 0 ? 'var(--color-primary)' : 'var(--text-primary)',
            }}
          >
            <Filter size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '11px',
                  padding: '1px 6px',
                  fontWeight: 700,
                  marginLeft: '2px',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Switcher (List vs Kanban) */}
          <div
            style={{
              display: 'flex',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Table / List View"
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <List size={16} />
              <span className="hidden sm:inline">List</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'kanban' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'kanban' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilterPanel && (
        <div
          className="card animate-fade-in"
          style={{
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: '#F5EFE3',
            border: '1px solid #D8C9A8',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Advanced Filter Matrix
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={12} />
                Reset All Filters
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Operation Type Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Operation Type
              </label>
              <select
                className="form-select"
                value={operationType}
                onChange={(e) => {
                  setOperationType(e.target.value);
                  setPage(1);
                }}
                style={{ backgroundColor: '#FFFFFF', fontSize: '13px' }}
              >
                <option value="">All Operations</option>
                <option value="RECEIPT">Inbound Receipts</option>
                <option value="DELIVERY">Outbound Deliveries</option>
                <option value="TRANSFER_IN">Internal Transfer In</option>
                <option value="TRANSFER_OUT">Internal Transfer Out</option>
                <option value="ADJUSTMENT_GAIN">Physical Count Gain</option>
                <option value="ADJUSTMENT_LOSS">Physical Count Loss</option>
                <option value="INITIAL_SEED">Initial Opening Balance</option>
              </select>
            </div>

            {/* Warehouse Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Warehouse
              </label>
              <select
                className="form-select"
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setPage(1);
                }}
                style={{ backgroundColor: '#FFFFFF', fontSize: '13px' }}
              >
                <option value="">All Facilities</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Target Product
              </label>
              <select
                className="form-select"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setPage(1);
                }}
                style={{ backgroundColor: '#FFFFFF', fontSize: '13px' }}
              >
                <option value="">All Catalog Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Page Limit Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Items Per Page
              </label>
              <select
                className="form-select"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ backgroundColor: '#FFFFFF', fontSize: '13px' }}
              >
                <option value={15}>15 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      {loading ? (
        <LoadingState text="Loading movement ledger entries..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadLedger} />
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          title="No Stock Movements Found"
          description={
            searchQuery || activeFilterCount > 0
              ? 'No ledger records matched your active search or filter parameters.'
              : 'There are currently no recorded inventory movement transactions.'
          }
          actionText={activeFilterCount > 0 || searchQuery ? 'Clear Search & Filters' : undefined}
          onAction={handleClearFilters}
        />
      ) : viewMode === 'list' ? (
        /* Primary View: ERP Data Table */
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5EFE3', borderBottom: '2px solid #D8C9A8' }}>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Reference
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Product
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    From
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    To
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Operation
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Quantity
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Date & Time
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Responsible
                  </th>
                  <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => {
                  const routing = getMovementRouting(e);
                  const isPositive = e.quantity > 0;
                  const pName = e.productName || e.product?.name || 'Product';
                  const sku = e.sku || e.product?.sku || 'N/A';
                  const uom = e.uom || e.product?.uom?.symbol || 'pcs';
                  const ref = e.referenceNumber || e.referenceId || 'N/A';
                  const responsible = e.createdBy || e.user?.name || 'System';

                  return (
                    <tr
                      key={e.id}
                      onClick={() => handleRowClick(e)}
                      style={{
                        borderBottom: '1px solid #EBE3D3',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(evt) => (evt.currentTarget.style.backgroundColor = 'rgba(79, 91, 42, 0.04)')}
                      onMouseLeave={(evt) => (evt.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Reference Identifier */}
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          {ref}
                        </div>
                      </td>

                      {/* Product Name & SKU */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {pName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              backgroundColor: '#F5EFE3',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              border: '1px solid #D8C9A8',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {sku}
                          </span>
                        </div>
                      </td>

                      {/* From */}
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 500 }}>{routing.from}</div>
                      </td>

                      {/* To */}
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ArrowRight size={13} color="var(--color-accent)" />
                          {routing.to}
                        </div>
                      </td>

                      {/* Operation Type */}
                      <td style={{ padding: '14px 18px' }}>{getOperationBadge(e.operationType)}</td>

                      {/* Quantity Delta */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: isPositive ? 'var(--color-primary)' : '#A33B2E',
                          }}
                        >
                          {isPositive ? `+${e.quantity}` : e.quantity} <span style={{ fontSize: '12px', fontWeight: 500 }}>{uom}</span>
                        </div>
                        {e.balanceAfter !== undefined && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Bal: {e.balanceAfter} {uom}
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(e.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(e.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Responsible User */}
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} color="var(--text-muted)" />
                          <span>{responsible}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(79, 91, 42, 0.1)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <CheckCircle2 size={11} />
                          Done
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#F5EFE3',
              borderTop: '1px solid #D8C9A8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing <strong>{(page - 1) * limit + 1}</strong> -{' '}
              <strong>{Math.min(page * limit, totalCount)}</strong> of <strong>{totalCount}</strong> movements
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', padding: '0 8px' }}>
                Page {page} of {totalPages || 1}
              </div>

              <button
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                style={{
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Secondary View: Kanban Grouped by Operation Workflow */
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {[
              {
                title: 'Inbound Receipts',
                ops: ['RECEIPT', 'INITIAL_SEED'],
                color: 'var(--color-primary)',
                icon: <ArrowDownLeft size={16} />,
              },
              {
                title: 'Outbound Deliveries',
                ops: ['DELIVERY'],
                color: '#B8892D',
                icon: <ArrowUpRight size={16} />,
              },
              {
                title: 'Internal Transfers',
                ops: ['TRANSFER_IN', 'TRANSFER_OUT'],
                color: '#2563EB',
                icon: <ArrowLeftRight size={16} />,
              },
              {
                title: 'Cycle Adjustments',
                ops: ['ADJUSTMENT_GAIN', 'ADJUSTMENT_LOSS'],
                color: '#7C3AED',
                icon: <SlidersHorizontal size={16} />,
              },
            ].map((col) => {
              const colEntries = filteredEntries.filter((e) => col.ops.includes(e.operationType));
              return (
                <div
                  key={col.title}
                  style={{
                    backgroundColor: '#F5EFE3',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #D8C9A8',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '750px',
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                      paddingBottom: '10px',
                      borderBottom: '2px solid #D8C9A8',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: col.color }}>
                      {col.icon}
                      <span>{col.title}</span>
                    </div>
                    <span
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D8C9A8',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {colEntries.length}
                    </span>
                  </div>

                  {/* Cards Scrollable Container */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {colEntries.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No movements in this category
                      </div>
                    ) : (
                      colEntries.map((e) => {
                        const routing = getMovementRouting(e);
                        const isPositive = e.quantity > 0;
                        const pName = e.productName || e.product?.name || 'Product';
                        const sku = e.sku || e.product?.sku || '';
                        const uom = e.uom || e.product?.uom?.symbol || 'pcs';
                        const ref = e.referenceNumber || e.referenceId || 'N/A';

                        return (
                          <div
                            key={e.id}
                            onClick={() => handleRowClick(e)}
                            className="card"
                            style={{
                              padding: '14px',
                              cursor: 'pointer',
                              border: '1px solid var(--border-medium)',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: '#FFFFFF',
                              boxShadow: 'var(--shadow-sm)',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                            onMouseEnter={(evt) => {
                              evt.currentTarget.style.transform = 'translateY(-2px)';
                              evt.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            }}
                            onMouseLeave={(evt) => {
                              evt.currentTarget.style.transform = 'translateY(0)';
                              evt.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                            }}
                          >
                            {/* Card Top: Reference + Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--color-primary)' }}>
                                {ref}
                              </span>
                              {getOperationBadge(e.operationType)}
                            </div>

                            {/* Product & Quantity */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{pName}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sku}</div>
                              </div>
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 800,
                                  color: isPositive ? 'var(--color-primary)' : '#A33B2E',
                                }}
                              >
                                {isPositive ? `+${e.quantity}` : e.quantity} <span style={{ fontSize: '11px' }}>{uom}</span>
                              </div>
                            </div>

                            {/* Route */}
                            <div
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--text-secondary)',
                                backgroundColor: '#F5EFE3',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                border: '1px solid #D8C9A8',
                              }}
                            >
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <strong>From:</strong> {routing.from}
                              </div>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                                <strong>To:</strong> {routing.to}
                              </div>
                            </div>

                            {/* Card Footer: Timestamp & User */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>{new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <span>{e.createdBy || e.user?.name || 'System'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Movement Detail Sheet / Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Stock Movement Ledger Detail"
      >
        {selectedEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header summary banner */}
            <div
              style={{
                backgroundColor: '#F5EFE3',
                border: '1px solid #D8C9A8',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Document Reference
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                  {selectedEntry.referenceNumber || selectedEntry.referenceId || 'Manual Movement'}
                </div>
              </div>
              <div>{getOperationBadge(selectedEntry.operationType)}</div>
            </div>

            {/* Quantity Delta Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <div className="card" style={{ padding: '14px', backgroundColor: '#FFFFFF' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Movement Delta</div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: selectedEntry.quantity > 0 ? 'var(--color-primary)' : '#A33B2E',
                    marginTop: '2px',
                  }}
                >
                  {selectedEntry.quantity > 0 ? `+${selectedEntry.quantity}` : selectedEntry.quantity}{' '}
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    {selectedEntry.uom || selectedEntry.product?.uom?.symbol || 'pcs'}
                  </span>
                </div>
              </div>

              <div className="card" style={{ padding: '14px', backgroundColor: '#FFFFFF' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Balance After Movement</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedEntry.balanceAfter !== undefined ? selectedEntry.balanceAfter : 'N/A'}{' '}
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    {selectedEntry.uom || selectedEntry.product?.uom?.symbol || 'pcs'}
                  </span>
                </div>
              </div>
            </div>

            {/* Product & Warehouse Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Package size={20} color="var(--color-primary)" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Product Details</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedEntry.productName || selectedEntry.product?.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    SKU: {selectedEntry.sku || selectedEntry.product?.sku}
                  </div>
                </div>
              </div>

              {/* Physical Pathway */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Building2 size={20} color="var(--color-accent)" style={{ marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Physical Route</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                    <strong>From:</strong> {getMovementRouting(selectedEntry).from}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    <strong>To:</strong> {getMovementRouting(selectedEntry).to}
                  </div>
                </div>
              </div>

              {/* Timestamp & Responsible */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Calendar size={20} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Transaction Audit</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {new Date(selectedEntry.createdAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Created By: {selectedEntry.createdBy || selectedEntry.user?.name || 'System Auto-Engine'}
                  </div>
                </div>
              </div>
            </div>

            {/* Source Document Link Button */}
            {(selectedEntry.referenceNumber || selectedEntry.referenceId) && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-light)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setDetailModalOpen(false);
                    navigateToSourceDocument(selectedEntry);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={15} />
                  Open Related Document
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MoveHistoryPage;

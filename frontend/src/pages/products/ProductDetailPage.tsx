import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi, Product } from '../../services/productApi';
import { stockApi, StockItem, StockLedgerEntry } from '../../services/stockApi';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, Edit3, MapPin, History, AlertTriangle, Box } from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [stockLocations, setStockLocations] = useState<StockItem[]>([]);
  const [ledgerHistory, setLedgerHistory] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProductData(id);
  }, [id]);

  const loadProductData = async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, stockRes, ledgerRes] = await Promise.all([
        productApi.getProductById(productId),
        stockApi.getStockByProduct(productId),
        stockApi.getLedgerHistory({ productId, limit: 10 }),
      ]);

      if (prodRes.data?.product) {
        setProduct(prodRes.data.product);
      }
      if (stockRes.data?.stock) {
        setStockLocations(stockRes.data.stock);
      }
      if (ledgerRes.data?.entries) {
        setLedgerHistory(ledgerRes.data.entries);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product details');
      showToast('error', 'Error loading product', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading product profile & inventory distribution..." />;
  if (error || !product) return <ErrorState message={error || 'Product not found'} onRetry={() => id && loadProductData(id)} />;

  const isLowStock = product.stockStatus === 'LOW_STOCK';
  const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
            style={{ padding: '8px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {product.name}
              </h1>
              <StatusBadge status={product.stockStatus} />
              {!product.active && <StatusBadge status="INACTIVE" />}
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              SKU: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>{product.sku}</span>
            </p>
          </div>
        </div>

        <Link
          to={`/products?edit=${product.id}`}
          className="btn btn-secondary"
          style={{ fontSize: '13px' }}
        >
          <Edit3 size={15} /> Edit Details
        </Link>
      </div>

      {/* Stock Alerts if low / out of stock */}
      {(isLowStock || isOutOfStock) && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: isOutOfStock ? 'var(--status-canceled-bg)' : 'var(--status-waiting-bg)',
            border: `1px solid ${isOutOfStock ? 'var(--status-canceled-border)' : 'var(--status-waiting-border)'}`,
            color: isOutOfStock ? 'var(--status-canceled-text)' : 'var(--status-waiting-text)',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>
              {isOutOfStock ? 'Stock Alert: Out of Stock' : 'Stock Alert: Low Inventory Level'}
            </div>
            <div style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '2px' }}>
              Current total stock is {product.totalStock} {product.uom.symbol}. The defined reorder threshold is {product.reorderLevel} {product.uom.symbol}.
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total On-Hand
          </span>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)' }}>{product.totalStock}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>{product.uom.symbol}</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Live aggregated balance</span>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reorder Level
          </span>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-accent)' }}>{product.reorderLevel}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>{product.uom.symbol}</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Min safety threshold</span>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Unit Cost
          </span>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)' }}>₹{product.perUnitCost.toFixed(2)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {product.uom.symbol}</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Standard valuation</span>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Category
          </span>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{product.category.name}</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            UoM: {product.uom.name} ({product.uom.symbol})
          </span>
        </div>
      </div>

      {/* Location Stock Breakdown */}
      <div className="card" style={{ overflow: 'hidden' }}>
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
            <MapPin size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Stock Distribution by Location
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stockLocations.length} locations holding stock</span>
        </div>

        {stockLocations.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Box size={36} color="var(--border-strong)" style={{ margin: '0 auto 8px auto' }} />
            No physical stock found at any active warehouse location.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Location Name</th>
                  <th>Location Code</th>
                  <th style={{ textAlign: 'right' }}>Available Qty</th>
                  <th style={{ textAlign: 'right' }}>Valuation</th>
                </tr>
              </thead>
              <tbody>
                {stockLocations.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.warehouseName}</span>{' '}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({item.warehouseCode})</span>
                    </td>
                    <td>{item.locationName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-primary)' }}>
                      {item.locationCode}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {item.quantity} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{product.uom.symbol}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{(item.quantity * product.perUnitCost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Ledger Audit Trail */}
      <div className="card" style={{ overflow: 'hidden' }}>
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
            <History size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Stock Movements (Audit Ledger)
            </h2>
          </div>
          <Link to={`/move-history?productId=${product.id}`} style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            View full ledger &rarr;
          </Link>
        </div>

        {ledgerHistory.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No stock movements recorded for this product yet.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operation</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Movement</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {ledgerHistory.map((entry) => {
                  const isPositive = entry.quantity > 0;
                  return (
                    <tr key={entry.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <StatusBadge status={entry.operationType} size="sm" />
                      </td>
                      <td>
                        {entry.location ? `${entry.location.warehouse.name} - ${entry.location.name}` : '-'}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isPositive ? 'var(--color-primary)' : 'var(--status-canceled-text)',
                        }}
                      >
                        {isPositive ? `+${entry.quantity}` : entry.quantity} {product.uom.symbol}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {entry.referenceNumber || entry.referenceId || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ProductDetailPage;

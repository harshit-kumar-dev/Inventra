import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { productApi, Product, Category, UnitOfMeasure } from '../../services/productApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCost, setFormCost] = useState('0');
  const [formCatId, setFormCatId] = useState('');
  const [formUomId, setFormUomId] = useState('');
  const [formReorder, setFormReorder] = useState('10');

  const { success, error } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [prodRes, catRes, uomRes] = await Promise.all([
        productApi.getProducts({
          search,
          categoryId: selectedCategory,
          page,
          limit: 15,
        }),
        productApi.getCategories(),
        productApi.getUnits(),
      ]);

      setProducts(prodRes.data?.products || []);
      setTotalPages(prodRes.meta?.totalPages || 1);
      setTotalCount(prodRes.meta?.total || 0);

      const cats = catRes.data?.categories || [];
      setCategories(cats);
      if (cats.length > 0 && !formCatId) setFormCatId(cats[0].id);

      const uoms = uomRes.data?.units || [];
      setUnits(uoms);
      if (uoms.length > 0 && !formUomId) setFormUomId(uoms[0].id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load products.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, page]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await productApi.createProduct({
        name: formName,
        sku: formSku,
        description: formDesc,
        perUnitCost: parseFloat(formCost) || 0,
        categoryId: formCatId,
        uomId: formUomId,
        reorderLevel: parseFloat(formReorder) || 10,
      });
      success(`Product '${formName}' created successfully!`);
      setIsModalOpen(false);
      // Reset form
      setFormName('');
      setFormSku('');
      setFormDesc('');
      setFormCost('0');
      loadData();
    } catch (err: any) {
      error(err?.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Products Catalog
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Master inventory items, SKU codes, units of measure, and multi-location balances.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          Add New Product
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by SKU or Product Name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
        </div>

        <div style={{ minWidth: '200px' }}>
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button onClick={loadData} className="btn btn-secondary" title="Refresh Table">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <LoadingState message="Loading products..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} onRetry={loadData} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={search ? `No products match search term "${search}".` : 'Get started by creating your first product.'}
          actionText="Create Product"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="table-container animate-fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Unit Cost</th>
                <th>Reorder Level</th>
                <th>Total On Hand</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                let badgeStyle = {
                  background: 'var(--status-done-bg)',
                  color: 'var(--status-done-text)',
                  border: '1px solid var(--status-done-border)',
                };
                let statusLabel = 'In Stock';
                let StatusIcon = CheckCircle;

                if (p.stockStatus === 'OUT_OF_STOCK') {
                  badgeStyle = {
                    background: 'var(--status-canceled-bg)',
                    color: 'var(--status-canceled-text)',
                    border: '1px solid var(--status-canceled-border)',
                  };
                  statusLabel = 'Out of Stock';
                  StatusIcon = XCircle;
                } else if (p.stockStatus === 'LOW_STOCK') {
                  badgeStyle = {
                    background: 'var(--status-waiting-bg)',
                    color: 'var(--status-waiting-text)',
                    border: '1px solid var(--status-waiting-border)',
                  };
                  statusLabel = 'Low Stock';
                  StatusIcon = AlertTriangle;
                }

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {p.sku}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {p.category?.name || 'General'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>₹{p.perUnitCost.toLocaleString()}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {p.reorderLevel} {p.uom?.symbol}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: p.totalStock <= 0 ? 'var(--status-canceled-text)' : 'var(--color-primary)' }}>
                        {p.totalStock} {p.uom?.symbol}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={badgeStyle}
                      >
                        <StatusIcon size={12} />
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/products/${p.id}`} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                        <Eye size={14} />
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '13px',
              color: 'var(--text-muted)',
              background: '#FAF8F5',
            }}
          >
            <span>
              Showing {products.length} of {totalCount} products
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Inventory Product">
        <form onSubmit={handleCreateProduct}>
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Steel Rods 20mm"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">SKU / Item Code</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. RAW-STL-001"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formCatId}
                onChange={(e) => setFormCatId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <select
                className="form-select"
                value={formUomId}
                onChange={(e) => setFormUomId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Level</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formReorder}
                onChange={(e) => setFormReorder(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Detailed specifications, dimensions, material grade..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default ProductListPage;

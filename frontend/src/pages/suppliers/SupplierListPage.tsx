import React, { useState, useEffect } from 'react';
import { supplierApi, Supplier } from '../../services/supplierApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { Users, Plus, Edit2, Mail, Phone, MapPin, Truck } from 'lucide-react';

export const SupplierListPage: React.FC = () => {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supplier modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supplierApi.getSuppliers();
      setSuppliers(res.data?.suppliers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingSupplier(sup);
    setName(sup.name);
    setContactName(sup.contactName || '');
    setEmail(sup.email || '');
    setPhone(sup.phone || '');
    setAddress(sup.address || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingSupplier) {
        await supplierApi.updateSupplier(editingSupplier.id, {
          name,
          contactName,
          email,
          phone,
          address,
        });
        showToast('success', 'Supplier Updated', `Supplier "${name}" was updated successfully.`);
      } else {
        await supplierApi.createSupplier({
          name,
          contactName,
          email,
          phone,
          address,
        });
        showToast('success', 'Supplier Created', `Supplier "${name}" was registered successfully.`);
      }
      setModalOpen(false);
      await loadSuppliers();
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Users size={26} color="var(--color-primary)" />
            Vendor & Supplier Directory
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Maintain inbound partner profiles and procurement contact directories
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading supplier directories..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSuppliers} />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Suppliers Registered"
          description="Add your first procurement vendor to enable incoming shipment receipts."
          actionText="Register Supplier"
          onAction={handleOpenCreate}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface-tint)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                        flexShrink: 0,
                      }}
                    >
                      <Truck size={22} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                        }}
                      >
                        {sup.name}
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {sup.contactName ? `Contact: ${sup.contactName}` : 'General Vendor'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(sup, e)}
                    style={{
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Edit Supplier"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {sup.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                      <span style={{ wordBreak: 'break-all' }}>{sup.email}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                      <span>{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Total Inbound Orders</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-surface-tint)',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {sup._count?.receipts || 0} Receipts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Vendor Profile' : 'Register New Vendor / Supplier'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Company / Vendor Name <span style={{ color: 'var(--rose-400)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Global Electronics Ltd"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g., John Smith"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +91 98765 43210"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., procurement@globalelec.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Physical / Billing Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Vendor fulfillment hub or headquarters address..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : editingSupplier ? 'Update Vendor' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default SupplierListPage;

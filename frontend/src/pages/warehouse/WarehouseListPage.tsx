import React, { useState, useEffect } from 'react';
import { warehouseApi, Warehouse, Location } from '../../services/warehouseApi';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { Building2, Plus, MapPin, ChevronRight, Edit2, Layers, CheckCircle2 } from 'lucide-react';

export const WarehouseListPage: React.FC = () => {
  const { showToast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Warehouse Modal
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [savingWh, setSavingWh] = useState(false);

  // Location Modal
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('INTERNAL');
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await warehouseApi.getWarehouses();
      const list = res.data?.warehouses || [];
      setWarehouses(list);
      if (list.length > 0) {
        if (selectedWarehouse) {
          const updated = list.find((w) => w.id === selectedWarehouse.id) || list[0];
          setSelectedWarehouse(updated);
        } else {
          setSelectedWarehouse(list[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhCreate = () => {
    setEditingWh(null);
    setWhName('');
    setWhCode('');
    setWhAddress('');
    setWhModalOpen(true);
  };

  const handleOpenWhEdit = (wh: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWh(wh);
    setWhName(wh.name);
    setWhCode(wh.code);
    setWhAddress(wh.address || '');
    setWhModalOpen(true);
  };

  const handleWhSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWh(true);
    try {
      if (editingWh) {
        await warehouseApi.updateWarehouse(editingWh.id, {
          name: whName,
          code: whCode,
          address: whAddress,
        });
        showToast('success', 'Warehouse Updated', `Warehouse ${whName} saved successfully.`);
      } else {
        await warehouseApi.createWarehouse({
          name: whName,
          code: whCode,
          address: whAddress,
        });
        showToast('success', 'Warehouse Created', `Warehouse ${whName} created successfully.`);
      }
      setWhModalOpen(false);
      loadWarehouses();
    } catch (err: any) {
      showToast('error', 'Error Saving Warehouse', err.message);
    } finally {
      setSavingWh(false);
    }
  };

  const handleOpenLocCreate = () => {
    if (!selectedWarehouse) return;
    setEditingLoc(null);
    setLocName('');
    setLocCode('');
    setLocType('INTERNAL');
    setLocModalOpen(true);
  };

  const handleOpenLocEdit = (loc: Location) => {
    setEditingLoc(loc);
    setLocName(loc.name);
    setLocCode(loc.code);
    setLocType(loc.type);
    setLocModalOpen(true);
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    setSavingLoc(true);
    try {
      if (editingLoc) {
        await warehouseApi.updateLocation(editingLoc.id, {
          name: locName,
          code: locCode,
          type: locType,
        });
        showToast('success', 'Location Updated', `Location ${locName} saved.`);
      } else {
        await warehouseApi.createLocation({
          warehouseId: selectedWarehouse.id,
          name: locName,
          code: locCode,
          type: locType,
        });
        showToast('success', 'Location Added', `Location ${locName} created.`);
      }
      setLocModalOpen(false);
      loadWarehouses();
    } catch (err: any) {
      showToast('error', 'Error Saving Location', err.message);
    } finally {
      setSavingLoc(false);
    }
  };

  if (loading) return <LoadingState text="Loading warehouse topological structures..." />;
  if (error) return <ErrorState message={error} onRetry={loadWarehouses} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-400" /> Warehouses & Storage Locations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage multi-warehouse facilities and granular internal storage racks
          </p>
        </div>
        <button
          onClick={handleOpenWhCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-medium text-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Warehouse
        </button>
      </div>

      {warehouses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Warehouses Configured"
          description="Register your first warehouse facility to start storing items."
          actionText="Create Warehouse"
          onAction={handleOpenWhCreate}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Warehouse Selector Panel */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Facilities ({warehouses.length})
            </h2>
            <div className="space-y-2">
              {warehouses.map((wh) => {
                const isSelected = selectedWarehouse?.id === wh.id;
                return (
                  <div
                    key={wh.id}
                    onClick={() => setSelectedWarehouse(wh)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {wh.code}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition flex items-center gap-2">
                          {wh.name}
                          {!wh.active && <StatusBadge status="INACTIVE" />}
                        </div>
                        <span className="text-xs text-slate-400">
                          {wh.locations?.length || wh._count?.locations || 0} sub-locations
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenWhEdit(wh, e)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Edit Facility"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <ChevronRight
                        className={`w-5 h-5 transition ${
                          isSelected ? 'text-indigo-400 translate-x-1' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location details for Selected Warehouse */}
          <div className="lg:col-span-2 space-y-4">
            {selectedWarehouse ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{selectedWarehouse.name}</h2>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                        {selectedWarehouse.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedWarehouse.address || 'No physical address specified'}
                    </p>
                  </div>

                  <button
                    onClick={handleOpenLocCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Location
                  </button>
                </div>

                {/* Locations Table */}
                {(!selectedWarehouse.locations || selectedWarehouse.locations.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    No locations added in this warehouse yet. Click "Add Location" to define storage zones.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-3">Location Name</th>
                          <th className="px-6 py-3">Code</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedWarehouse.locations.map((loc) => (
                          <tr key={loc.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-6 py-3.5 font-medium text-white flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-indigo-400" />
                              {loc.name}
                            </td>
                            <td className="px-6 py-3.5 font-mono text-cyan-400 text-xs font-semibold">
                              {loc.code}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">
                                {loc.type}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              {loc.active ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                </span>
                              ) : (
                                <StatusBadge status="INACTIVE" />
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <button
                                onClick={() => handleOpenLocEdit(loc)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                title="Edit Location"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
                Select a warehouse from the list to view and manage its storage racks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouse Modal */}
      <Modal
        isOpen={whModalOpen}
        onClose={() => setWhModalOpen(false)}
        title={editingWh ? 'Edit Warehouse Facility' : 'Create Warehouse Facility'}
        size="md"
      >
        <form onSubmit={handleWhSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Warehouse Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="e.g., Central Distribution Center"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Unique Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={whCode}
              onChange={(e) => setWhCode(e.target.value.toUpperCase())}
              placeholder="e.g., WH-MAIN"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Address / Location Details
            </label>
            <textarea
              rows={2}
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="Physical street address or campus zone..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setWhModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingWh}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {savingWh ? 'Saving...' : editingWh ? 'Update Facility' : 'Create Facility'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Location Modal */}
      <Modal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={editingLoc ? 'Edit Storage Location' : `Add Location in ${selectedWarehouse?.name}`}
        size="md"
      >
        <form onSubmit={handleLocSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Location Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g., Rack A-12, Bin 4"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Location Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={locCode}
              onChange={(e) => setLocCode(e.target.value.toUpperCase())}
              placeholder="e.g., LOC-A1"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Location Type
            </label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="INTERNAL">Internal Storage</option>
              <option value="INPUT">Receiving Dock / Input</option>
              <option value="OUTPUT">Dispatch / Output</option>
              <option value="SCRAP">Scrap / Quarantine</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setLocModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingLoc}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {savingLoc ? 'Saving...' : editingLoc ? 'Update Location' : 'Save Location'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default WarehouseListPage;

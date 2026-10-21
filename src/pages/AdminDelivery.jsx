import { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiClock,
  FiDollarSign,
  FiMapPin,
  FiCheckCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import { TbTruckDelivery } from 'react-icons/tb';
import {
  fetchAdminDeliveryChargesAPI,
  createAdminDeliveryChargeAPI,
  updateAdminDeliveryChargeAPI,
  deleteAdminDeliveryChargeAPI,
} from '../services/api';

const AdminDelivery = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    location: '',
    charge: 60,
    estimatedDays: '1-2 Business Days',
    isDefault: false,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Direct Inline Edit State
  const [editingChargeId, setEditingChargeId] = useState(null);
  const [tempCharge, setTempCharge] = useState('');

  const loadZones = useCallback(async () => {
    setLoading(true);
    setFeedback({ type: '', text: '' });
    try {
      const data = await fetchAdminDeliveryChargesAPI();
      setZones(data?.deliveryCharges || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load delivery zones.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormData({
      location: '',
      charge: 60,
      estimatedDays: '1-3 Business Days',
      isDefault: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      location: zone.location || '',
      charge: zone.charge !== undefined ? zone.charge : 60,
      estimatedDays: zone.estimatedDays || '1-3 Business Days',
      isDefault: Boolean(zone.isDefault),
      isActive: zone.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Save (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location.trim()) {
      setFeedback({ type: 'error', text: 'Location name is required.' });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', text: '' });

    try {
      const payload = {
        location: formData.location.trim(),
        charge: Math.max(0, Number(formData.charge) || 0),
        estimatedDays: formData.estimatedDays.trim() || '1-3 Business Days',
        isDefault: Boolean(formData.isDefault),
        isActive: Boolean(formData.isActive),
      };

      if (editingZone) {
        const res = await updateAdminDeliveryChargeAPI(editingZone.id || editingZone._id, payload);
        if (res?.success) {
          setFeedback({
            type: 'success',
            text: `Delivery zone "${payload.location}" updated to ৳${payload.charge} successfully.`,
          });
          setIsModalOpen(false);
          await loadZones();
        }
      } else {
        const res = await createAdminDeliveryChargeAPI(payload);
        if (res?.success) {
          setFeedback({
            type: 'success',
            text: `Delivery zone "${payload.location}" (৳${payload.charge}) created successfully.`,
          });
          setIsModalOpen(false);
          await loadZones();
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save delivery zone.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Quick Inline Charge Update
  const handleSaveInlineCharge = async (zone) => {
    const newCharge = Number(tempCharge);
    if (isNaN(newCharge) || newCharge < 0) {
      setEditingChargeId(null);
      return;
    }

    try {
      const res = await updateAdminDeliveryChargeAPI(zone.id || zone._id, { charge: newCharge });
      if (res?.success) {
        setZones((prev) =>
          prev.map((z) => (z.id === zone.id ? { ...z, charge: newCharge } : z))
        );
        setFeedback({
          type: 'success',
          text: `Updated delivery fee for "${zone.location}" to ৳${newCharge}.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to update fee.',
      });
    } finally {
      setEditingChargeId(null);
    }
  };

  // Toggle Default
  const handleSetDefault = async (zone) => {
    if (zone.isDefault) return;
    try {
      const res = await updateAdminDeliveryChargeAPI(zone.id || zone._id, { isDefault: true });
      if (res?.success) {
        setZones((prev) =>
          prev.map((z) => ({ ...z, isDefault: z.id === zone.id }))
        );
        setFeedback({
          type: 'success',
          text: `"${zone.location}" is now set as the default delivery zone.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to set default.',
      });
    }
  };

  // Toggle Active
  const handleToggleActive = async (zone) => {
    const nextActive = !zone.isActive;
    try {
      const res = await updateAdminDeliveryChargeAPI(zone.id || zone._id, { isActive: nextActive });
      if (res?.success) {
        setZones((prev) =>
          prev.map((z) => (z.id === zone.id ? { ...z, isActive: nextActive } : z))
        );
        setFeedback({
          type: 'success',
          text: `"${zone.location}" is now ${nextActive ? 'Active' : 'Disabled'}.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to toggle status.',
      });
    }
  };

  // Delete Zone
  const handleDelete = async (zone) => {
    if (!window.confirm(`Are you sure you want to delete delivery zone "${zone.location}"?`)) {
      return;
    }

    try {
      const res = await deleteAdminDeliveryChargeAPI(zone.id || zone._id);
      if (res?.success) {
        setZones((prev) => prev.filter((z) => z.id !== zone.id));
        setFeedback({
          type: 'success',
          text: `Delivery zone "${zone.location}" deleted successfully.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to delete delivery zone.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- PAGE HEADER ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TbTruckDelivery className="text-indigo-600 w-7 h-7" />
            <span>Delivery Locations & Shipping Charges</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage Inside Dhaka, Outside Dhaka delivery fees, delivery times & active checkout zones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadZones}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Zones"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Delivery Zone</span>
          </button>
        </div>
      </div>

      {/* ---------------- FEEDBACK NOTIFICATION ---------------- */}
      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <FiAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------------- ZONES CARDS GRID ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => {
          const isInside = zone.id === 'inside-dhaka' || zone.location.toLowerCase().includes('inside');
          const isOutside = zone.id === 'outside-dhaka' || zone.location.toLowerCase().includes('outside');
          const isEditingThis = editingChargeId === zone.id;

          return (
            <div
              key={zone.id || zone._id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all relative flex flex-col justify-between ${
                zone.isActive === false
                  ? 'border-slate-200 opacity-60 bg-slate-50/50'
                  : zone.isDefault
                  ? 'border-indigo-300 ring-2 ring-indigo-500/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Zone Header Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {zone.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                        Default Zone
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        zone.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {zone.isActive !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {zone.id}
                  </span>
                </div>

                {/* Location Title */}
                <div className="flex items-start gap-2.5 mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isInside
                        ? 'bg-blue-50 text-blue-600'
                        : isOutside
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <FiMapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      {zone.location}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <FiClock className="w-3 h-3 text-slate-400" />
                      <span>{zone.estimatedDays || '1-3 Business Days'}</span>
                    </p>
                  </div>
                </div>

                {/* Charge Rate Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Delivery Charge Fee:
                    </span>
                    {isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">৳</span>
                        <input
                          type="number"
                          min="0"
                          autoFocus
                          value={tempCharge}
                          onChange={(e) => setTempCharge(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineCharge(zone);
                            if (e.key === 'Escape') setEditingChargeId(null);
                          }}
                          className="w-16 bg-white border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-900 font-bold"
                        />
                        <button
                          onClick={() => handleSaveInlineCharge(zone)}
                          className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                          title="Save fee"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingChargeId(null)}
                          className="p-1 rounded bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-emerald-600">
                          ৳{zone.charge}
                        </span>
                        <button
                          onClick={() => {
                            setEditingChargeId(zone.id);
                            setTempCharge(String(zone.charge));
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                          title="Quick update fee"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActive(zone)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition-colors ${
                      zone.isActive !== false
                        ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {zone.isActive !== false ? 'Disable' : 'Enable'}
                  </button>

                  {!zone.isDefault && zone.isActive !== false && (
                    <button
                      onClick={() => handleSetDefault(zone)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] cursor-pointer"
                      title="Set as default selection on checkout"
                    >
                      Make Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(zone)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                    title="Edit Zone Details"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  {zones.length > 1 && (
                    <button
                      onClick={() => handleDelete(zone)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 cursor-pointer transition-colors"
                      title="Delete Delivery Zone"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- STOREFRONT CHECKOUT PREVIEW CARD ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>Customer Checkout Preview</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Storefront Preview
            </span>
          </h3>
          <span className="text-xs text-slate-500">
            Customers choose from these active locations during Cart & Quick Order checkout
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {zones
            .filter((z) => z.isActive !== false)
            .map((z) => (
              <div
                key={z.id}
                className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                  z.isDefault
                    ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{z.location}</span>
                    {z.isDefault && (
                      <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {z.estimatedDays || '1-3 Business Days'}
                  </div>
                </div>
                <div className="text-sm font-black text-emerald-600">
                  ৳{z.charge}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ---------------- ADD / EDIT ZONE MODAL ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <TbTruckDelivery className="text-indigo-600 w-5 h-5" />
                <span>{editingZone ? 'Edit Delivery Zone' : 'Add New Delivery Zone'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location Zone Name (e.g. Inside Dhaka, Outside Dhaka) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Inside Dhaka (ঢাকা সিটি) or Outside Dhaka (ঢাকার বাইরে)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Charge Fee (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.charge}
                    onChange={(e) => setFormData({ ...formData, charge: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Delivery Time (ডেলিভারির সময়সীমা)
                </label>
                <input
                  type="text"
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                  placeholder="e.g. 1-2 Business Days or 2-4 Business Days"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 space-y-2 text-xs border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-700">
                    Set as default selected zone on customer checkout
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-700">
                    Active (visible and selectable by customers)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingZone ? 'Save Changes' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDelivery;


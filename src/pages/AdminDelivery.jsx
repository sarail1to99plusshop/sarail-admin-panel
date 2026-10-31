import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiCheckSquare,
  FiSlash,
} from 'react-icons/fi';
import { TbTruckDelivery, TbCurrencyTaka } from 'react-icons/tb';
import {
  fetchAdminDeliveryChargesAPI,
  createAdminDeliveryChargeAPI,
  updateAdminDeliveryChargeAPI,
  deleteAdminDeliveryChargeAPI,
  fetchAdminDistrictsAPI,
  updateAdminDistrictStatusAPI,
} from '../services/api';

const AdminDelivery = () => {
  // Navigation Tabs: 'zones' | 'districts'
  const [activeTab, setActiveTab] = useState('zones');

  // Delivery Zones State
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Districts State
  const [districts, setDistricts] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [districtStatusFilter, setDistrictStatusFilter] = useState('all'); // 'all' | 'active' | 'disabled'
  const [togglingDistrict, setTogglingDistrict] = useState(null);

  // Add / Edit Delivery Zone Modal State
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

  // ---------------------------------------------------------------------------
  // Load Delivery Zones
  // ---------------------------------------------------------------------------
  const loadZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const data = await fetchAdminDeliveryChargesAPI();
      setZones(data?.deliveryCharges || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load delivery zones.',
      });
    } finally {
      setLoadingZones(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load Bangladesh 64 Districts
  // ---------------------------------------------------------------------------
  const loadDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    try {
      const data = await fetchAdminDistrictsAPI({ includeInactive: 'true' });
      setDistricts(data?.districts || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to load Bangladesh districts.',
      });
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
    loadDistricts();
  }, [loadZones, loadDistricts]);

  // ---------------------------------------------------------------------------
  // District Toggle Active / Disabled
  // ---------------------------------------------------------------------------
  const handleToggleDistrict = async (district) => {
    const nextStatus = district.isActive === false; // If currently false, next is true
    setTogglingDistrict(district.name);

    // Optimistic UI update
    setDistricts((prev) =>
      prev.map((d) => (d.name === district.name ? { ...d, isActive: nextStatus } : d))
    );

    try {
      const res = await updateAdminDistrictStatusAPI(district.name, nextStatus);
      setFeedback({
        type: 'success',
        text:
          res?.message ||
          `District "${district.name}" (${district.bn}) is now ${nextStatus ? 'enabled' : 'disabled'}.`,
      });
    } catch (err) {
      // Revert optimistic update on failure
      setDistricts((prev) =>
        prev.map((d) => (d.name === district.name ? { ...d, isActive: !nextStatus } : d))
      );
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to update district status.',
      });
    } finally {
      setTogglingDistrict(null);
    }
  };

  // Filtered Districts
  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      if (selectedDivision && d.division.toLowerCase() !== selectedDivision.toLowerCase()) {
        return false;
      }
      if (districtStatusFilter === 'active' && d.isActive === false) {
        return false;
      }
      if (districtStatusFilter === 'disabled' && d.isActive !== false) {
        return false;
      }
      if (districtSearch.trim()) {
        const query = districtSearch.trim().toLowerCase();
        const matchesName = d.name.toLowerCase().includes(query);
        const matchesBn = d.bn && d.bn.includes(query);
        const matchesDiv = d.division && d.division.toLowerCase().includes(query);
        return matchesName || matchesBn || matchesDiv;
      }
      return true;
    });
  }, [districts, selectedDivision, districtStatusFilter, districtSearch]);

  const totalActiveDistricts = useMemo(
    () => districts.filter((d) => d.isActive !== false).length,
    [districts]
  );
  const totalDisabledDistricts = useMemo(
    () => districts.filter((d) => d.isActive === false).length,
    [districts]
  );

  // ---------------------------------------------------------------------------
  // Delivery Zone Actions
  // ---------------------------------------------------------------------------
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location.trim()) {
      setFeedback({ type: 'error', text: 'Location name is required.' });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', text: '' });

    try {
      if (editingZone) {
        await updateAdminDeliveryChargeAPI(editingZone.id || editingZone._id, formData);
        setFeedback({
          type: 'success',
          text: `Delivery zone "${formData.location}" updated successfully.`,
        });
      } else {
        await createAdminDeliveryChargeAPI(formData);
        setFeedback({
          type: 'success',
          text: `Delivery zone "${formData.location}" created successfully.`,
        });
      }
      setIsModalOpen(false);
      await loadZones();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save delivery zone.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSaveCharge = async (zone) => {
    const newCharge = Number(tempCharge);
    if (isNaN(newCharge) || newCharge < 0) {
      setFeedback({ type: 'error', text: 'Please enter a valid positive delivery fee.' });
      return;
    }

    try {
      await updateAdminDeliveryChargeAPI(zone.id || zone._id, { charge: newCharge });
      setEditingChargeId(null);
      setFeedback({
        type: 'success',
        text: `Updated delivery fee for "${zone.location}" to ৳${newCharge}.`,
      });
      await loadZones();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to update charge.',
      });
    }
  };

  const handleSetDefault = async (zone) => {
    try {
      await updateAdminDeliveryChargeAPI(zone.id || zone._id, { isDefault: true });
      setFeedback({
        type: 'success',
        text: `"${zone.location}" is now set as the default delivery zone.`,
      });
      await loadZones();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to set default zone.',
      });
    }
  };

  const handleToggleActive = async (zone) => {
    const nextStatus = zone.isActive === false;
    try {
      await updateAdminDeliveryChargeAPI(zone.id || zone._id, { isActive: nextStatus });
      setFeedback({
        type: 'success',
        text: `"${zone.location}" is now ${nextStatus ? 'active' : 'disabled'}.`,
      });
      await loadZones();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to toggle zone status.',
      });
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Are you sure you want to delete delivery zone "${zone.location}"?`)) {
      return;
    }

    try {
      await deleteAdminDeliveryChargeAPI(zone.id || zone._id);
      setFeedback({
        type: 'success',
        text: `Delivery zone "${zone.location}" has been removed.`,
      });
      await loadZones();
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
            <span>Delivery Locations & Districts Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure delivery fees (Inside Brahmanbaria, Outside Brahmanbaria, Inside Dhaka) & control active shipping districts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadZones();
              loadDistricts();
            }}
            disabled={loadingZones || loadingDistricts}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loadingZones || loadingDistricts ? 'animate-spin' : ''}`}
            />
          </button>
          {activeTab === 'zones' && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add Delivery Zone</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- PRIMARY NAVIGATION TABS ---------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === 'zones'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TbTruckDelivery className="w-4 h-4" />
          <span>Delivery Fee Zones ({zones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('districts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
            activeTab === 'districts'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FiMapPin className="w-4 h-4" />
          <span>Bangladesh 64 Districts ({districts.length})</span>
          {totalDisabledDistricts > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-extrabold">
              {totalDisabledDistricts} Disabled
            </span>
          )}
        </button>
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
            aria-label="Dismiss feedback"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: DELIVERY FEE ZONES                                           */}
      {/* =================================================================== */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          {/* Quick Info Banner */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold">Active Storefront Rates:</span>
              <span className="ml-1 text-indigo-800">
                Inside Brahmanbaria City (৳60), Inside Dhaka City (৳120), Outside Dhaka and Brahmanbaria (Rest of Bangladesh) (৳130).
              </span>
            </div>
            <span className="text-[11px] text-indigo-700 font-medium">
              Click &quot;Change&quot; to quickly edit any rate.
            </span>
          </div>

          {/* Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => {
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            zone.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {zone.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {zone.id}
                      </span>
                    </div>

                    {/* Zone Name */}
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <FiMapPin className="text-indigo-600 shrink-0 w-4 h-4" />
                      <span>{zone.location}</span>
                    </h3>

                    <div className="mt-2 space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <FiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Estimated: {zone.estimatedDays || '1-3 Business Days'}</span>
                      </div>

                      {/* Fee Display & Inline Edit */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <TbCurrencyTaka className="w-3.5 h-3.5 text-emerald-600" />
                          Delivery Fee:
                        </span>

                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-400">৳</span>
                            <input
                              type="number"
                              min="0"
                              value={tempCharge}
                              onChange={(e) => setTempCharge(e.target.value)}
                              className="w-16 px-2 py-1 text-xs font-bold border border-indigo-400 rounded-lg outline-none bg-white text-slate-900"
                              autoFocus
                            />
                            <button
                              onClick={() => handleQuickSaveCharge(zone)}
                              className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                              title="Save fee"
                              aria-label="Save fee"
                            >
                              <FiCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingChargeId(null)}
                              className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600 cursor-pointer"
                              title="Cancel"
                              aria-label="Cancel fee editing"
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
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs mt-4">
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
                        aria-label="Edit Zone Details"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      {zones.length > 1 && (
                        <button
                          onClick={() => handleDelete(zone)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-600 hover:white border border-rose-200 cursor-pointer transition-colors"
                          title="Delete Delivery Zone"
                          aria-label="Delete Delivery Zone"
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

          {/* Storefront Live Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Customer Checkout Preview</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Preview
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
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: BANGLADESH 64 DISTRICTS (ENABLE / DISABLE)                   */}
      {/* =================================================================== */}
      {activeTab === 'districts' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Districts</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{districts.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FiMapPin className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Active (Shipping Enabled)</span>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">
                  {totalActiveDistricts}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FiCheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Disabled (Shipping Blocked)</span>
                <div className="text-2xl font-black text-rose-600 mt-0.5">
                  {totalDisabledDistricts}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <FiSlash className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Division Filter Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search by District Name or Bangla */}
              <div className="relative sm:col-span-2">
                <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  placeholder="Search district by English or বাংলা (e.g. Narsingdi, নরসিংদী, Bandarban)..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={districtStatusFilter}
                  onChange={(e) => setDistrictStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Status (সব)</option>
                  <option value="active">Active Only ({totalActiveDistricts})</option>
                  <option value="disabled">Disabled Only ({totalDisabledDistricts})</option>
                </select>
              </div>
            </div>

            {/* Division Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold mr-1">Division:</span>
              {[
                { name: '', label: 'All (64)' },
                { name: 'Dhaka', label: 'Dhaka (13)' },
                { name: 'Chattogram', label: 'Chattogram (11)' },
                { name: 'Rajshahi', label: 'Rajshahi (8)' },
                { name: 'Khulna', label: 'Khulna (10)' },
                { name: 'Barishal', label: 'Barishal (6)' },
                { name: 'Sylhet', label: 'Sylhet (4)' },
                { name: 'Rangpur', label: 'Rangpur (8)' },
                { name: 'Mymensingh', label: 'Mymensingh (4)' },
              ].map((div) => {
                const isSelected = selectedDivision === div.name;
                return (
                  <button
                    key={div.name}
                    type="button"
                    onClick={() => setSelectedDivision(div.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {div.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Districts List / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredDistricts.map((d) => {
              const isTogglingThis = togglingDistrict === d.name;
              const isActive = d.isActive !== false;

              return (
                <div
                  key={d.name}
                  className={`bg-white rounded-xl border p-3.5 shadow-2xs transition-all flex flex-col justify-between ${
                    !isActive
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{d.name}</span>
                        <span className="text-xs text-slate-500 font-normal">({d.bn})</span>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                        {d.division}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {/* Toggle Switch Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {isActive ? 'Available for delivery' : 'Delivery suspended'}
                    </span>

                    <button
                      type="button"
                      disabled={isTogglingThis}
                      onClick={() => handleToggleDistrict(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                      title={isActive ? `Disable delivery to ${d.name}` : `Enable delivery to ${d.name}`}
                    >
                      {isTogglingThis ? (
                        <FiRefreshCw className="w-3 h-3 animate-spin" />
                      ) : isActive ? (
                        <>
                          <FiSlash className="w-3 h-3" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <FiCheck className="w-3 h-3" />
                          <span>Enable</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDistricts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 text-slate-500 text-xs">
              No districts match your search or filter criteria.
            </div>
          )}
        </div>
      )}

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
                aria-label="Close modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location Zone Name (e.g. Inside Brahmanbaria, Outside Brahmanbaria, Inside Dhaka) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Inside brahmanbaria, Outside brahmanbaria, Inside dhaka"
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Laptop, QrCode, SlidersHorizontal, 
  MapPin, DollarSign, Calendar, Tag, ShieldCheck, 
  Files, Clock, Printer, CheckCircle, AlertCircle, Eye, RefreshCcw
} from "lucide-react";
import { User, UserRole, Asset, AssetCategory, AssetStatus, AssetCondition } from "../types.js";

interface AssetModuleProps {
  user: User;
  onActivityLogged: () => void;
  preSelectedAssetId?: string | null;
  clearPreSelectedAssetId?: () => void;
  preFilledRegistrationCode?: string | null;
  clearPreFilledRegistrationCode?: () => void;
  onOpenScanner?: () => void;
}

export default function AssetModule({ 
  user, 
  onActivityLogged,
  preSelectedAssetId,
  clearPreSelectedAssetId,
  preFilledRegistrationCode,
  clearPreFilledRegistrationCode,
  onOpenScanner
}: AssetModuleProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssetTimeline, setSelectedAssetTimeline] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [showSharedOnly, setShowSharedOnly] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    serialNumber: "",
    condition: AssetCondition.EXCELLENT,
    location: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: "",
    isShared: false,
    warrantyExpiry: "",
    image: "",
    documents: "" // comma-separated strings
  });

  useEffect(() => {
    if (preSelectedAssetId && assets.length > 0) {
      const target = assets.find(a => a.id === preSelectedAssetId);
      if (target) {
        loadAssetTimeline(target);
      }
      if (clearPreSelectedAssetId) {
        clearPreSelectedAssetId();
      }
    }
  }, [preSelectedAssetId, assets]);

  useEffect(() => {
    if (preFilledRegistrationCode) {
      setForm(f => ({
        ...f,
        serialNumber: preFilledRegistrationCode
      }));
      setShowAddForm(true);
      if (clearPreFilledRegistrationCode) {
        clearPreFilledRegistrationCode();
      }
    }
  }, [preFilledRegistrationCode]);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const isManager = user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAssets, resCats] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/categories")
      ]);
      if (resAssets.ok) setAssets(await resAssets.json());
      if (resCats.ok) setCategories(await resCats.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.name || !form.categoryId || !form.serialNumber || !form.location || !form.purchaseCost) {
      setFormError("Please fill out all required fields.");
      return;
    }

    let finalCategoryId = form.categoryId;

    try {
      if (form.categoryId === "create_new") {
        if (!newCategoryName.trim()) {
          setFormError("Please enter a name for the new category.");
          return;
        }

        const catRes = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCategoryName.trim(),
            actorUserId: user.id
          })
        });

        const catData = await catRes.json();
        if (!catRes.ok) {
          throw new Error(catData.error || "Failed to create category");
        }

        finalCategoryId = catData.id;
        // Prepend or append to categories list
        setCategories(prev => [...prev, catData]);
        setNewCategoryName("");
      }

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: finalCategoryId,
          purchaseCost: parseFloat(form.purchaseCost),
          documents: form.documents ? form.documents.split(",").map(d => d.trim()) : [],
          actorUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to register asset");
      }

      setFormSuccess(`Asset ${data.name} was successfully registered under Tag: ${data.tag}!`);
      setForm({
        name: "",
        categoryId: "",
        serialNumber: "",
        condition: AssetCondition.EXCELLENT,
        location: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        purchaseCost: "",
        isShared: false,
        warrantyExpiry: "",
        image: "",
        documents: ""
      });
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const loadAssetTimeline = async (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedAssetTimeline([]);
    try {
      const res = await fetch(`/api/assets/${asset.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAssetTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory ? asset.categoryId === selectedCategory : true;
    const matchesStatus = selectedStatus ? asset.status === selectedStatus : true;
    const matchesCondition = selectedCondition ? asset.condition === selectedCondition : true;
    const matchesShared = showSharedOnly ? asset.isShared === true : true;

    return matchesSearch && matchesCategory && matchesStatus && matchesCondition && matchesShared;
  });

  return (
    <div className="space-y-6">
      {/* Search and filters header */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 font-display">Asset Registry</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Add catalog models, allocate properties, check warranties and trace complete physical lifecycle ledger.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search tag, model, serial..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs p-3 pl-9 border border-neutral-200 rounded-lg outline-indigo-600 font-medium"
                />
              </div>
              <button
                type="button"
                onClick={onOpenScanner}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 rounded-lg border border-indigo-100 transition cursor-pointer shrink-0"
                title="Scan Asset Tag (Camera/File)"
              >
                <QrCode size={15} />
              </button>
            </div>
            {isManager && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
              >
                <Plus size={15} />
                Register Asset
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-neutral-600 border-t border-neutral-100">
          <div className="flex items-center gap-1">
            <SlidersHorizontal size={12} className="text-neutral-400" />
            <span>Filters:</span>
          </div>
          
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="p-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="p-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700"
          >
            <option value="">All Statuses</option>
            {Object.values(AssetStatus).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={selectedCondition}
            onChange={e => setSelectedCondition(e.target.value)}
            className="p-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700"
          >
            <option value="">All Conditions</option>
            {Object.values(AssetCondition).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer ml-2 py-1">
            <input
              type="checkbox"
              checked={showSharedOnly}
              onChange={e => setShowSharedOnly(e.target.checked)}
              className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="text-xs">Shared Resources Only</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration form slide/pane */}
        {showAddForm && (
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 h-fit space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
            <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">
              Asset Registration Form
            </h4>
            
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg flex items-center gap-1.5">
                <CheckCircle size={14} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAsset} className="space-y-4 text-xs font-medium text-neutral-600">
              <div>
                <label className="block text-neutral-500 mb-1">Asset Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 7440, Meeting Room B"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 mb-1">Category *</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="create_new">+ Add New Category...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="DLX234234"
                    value={form.serialNumber}
                    onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                  />
                </div>
              </div>

              {form.categoryId === "create_new" && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-neutral-500 mb-1">New Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tablets, Wearables"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 mb-1">Condition *</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value as AssetCondition })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 bg-white"
                  >
                    {Object.values(AssetCondition).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">Floor / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="IT Floor 2"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 mb-1">Purchase Cost (USD) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 1200"
                    value={form.purchaseCost}
                    onChange={e => setForm({ ...form, purchaseCost: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={form.purchaseDate}
                    onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 mb-1">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={form.warrantyExpiry}
                    onChange={e => setForm({ ...form, warrantyExpiry: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition">
                    <input
                      type="checkbox"
                      checked={form.isShared}
                      onChange={e => setForm({ ...form, isShared: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span className="text-neutral-700">Shared Resource</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">Image Mock URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={form.image}
                  onChange={e => setForm({ ...form, image: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">Documents Link (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="UserManual.pdf, PurchaseReceipt.pdf"
                  value={form.documents}
                  onChange={e => setForm({ ...form, documents: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  Register Asset
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Asset Catalog Grid */}
        <div className={`${showAddForm || selectedAsset ? "lg:col-span-2" : "lg:col-span-3"} grid grid-cols-1 md:grid-cols-2 gap-4 h-fit`}>
          {filteredAssets.length === 0 ? (
            <div className="col-span-full bg-white border border-neutral-200 p-12 text-center rounded-xl space-y-2">
              <Laptop size={32} className="mx-auto text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-700">No assets registered in category</p>
              <p className="text-xs text-neutral-400">Try modifying filter choices or add a new hardware asset to inventory.</p>
            </div>
          ) : (
            filteredAssets.map(asset => {
              const cat = categories.find(c => c.id === asset.categoryId);
              return (
                <div 
                  key={asset.id}
                  onClick={() => loadAssetTimeline(asset)}
                  className={`p-5 bg-white border rounded-xl hover:shadow-md transition duration-200 flex flex-col justify-between h-48 cursor-pointer relative ${
                    selectedAsset?.id === asset.id ? "border-indigo-600 shadow-sm ring-1 ring-indigo-500" : "border-neutral-200"
                  }`}
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-neutral-400 px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 uppercase tracking-wider">
                        {asset.tag}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        asset.status === AssetStatus.AVAILABLE
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : asset.status === AssetStatus.ALLOCATED
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          : asset.status === AssetStatus.UNDER_MAINTENANCE
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      }`}>
                        {asset.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-display font-semibold text-neutral-800 text-sm mt-3 group-hover:text-indigo-600 transition truncate">
                      {asset.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 font-medium truncate mt-0.5">
                      {cat ? cat.name : "Uncategorized"} • S/N: {asset.serialNumber}
                    </p>
                  </div>

                  {/* Footer Stats */}
                  <div className="border-t border-neutral-100 pt-3 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-neutral-400 shrink-0" />
                      {asset.location}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-neutral-700">
                      <DollarSign size={11} className="text-neutral-400 shrink-0" />
                      {asset.purchaseCost.toLocaleString()}
                    </span>
                  </div>

                  {/* Shared tag banner */}
                  {asset.isShared && (
                    <span className="absolute bottom-12 right-5 bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                      SHARED
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Asset Information Timeline Side-Panel */}
        {selectedAsset && (
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 h-fit space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 shadow-sm relative">
            <button
              onClick={() => setSelectedAsset(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 text-xs font-semibold"
            >
              Close ✕
            </button>

            <div>
              <span className="font-mono text-[10px] font-bold text-neutral-400 px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                {selectedAsset.tag}
              </span>
              <h4 className="font-display font-bold text-neutral-800 text-base mt-2">{selectedAsset.name}</h4>
              <p className="text-xs text-neutral-500 font-semibold">{categories.find(c => c.id === selectedAsset.categoryId)?.name}</p>
            </div>

            {/* QR Mockup component */}
            <div className="bg-neutral-50 border border-neutral-150 p-4 rounded-xl flex items-center gap-4">
              <QrCode size={48} className="text-neutral-800 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-neutral-700">Digital Asset Tag Label</p>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">S/N: {selectedAsset.serialNumber}</p>
                <button 
                  onClick={() => window.print()}
                  className="mt-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Printer size={10} />
                  Print Label Barcode
                </button>
              </div>
            </div>

            {/* Info Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs border-y border-neutral-100 py-4 font-semibold text-neutral-700">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 font-medium block">CONDITION</span>
                <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 text-[10px]">{selectedAsset.condition}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 font-medium block">ACQUIRED COST</span>
                <span>${selectedAsset.purchaseCost.toLocaleString()}</span>
              </div>
              <div className="space-y-1 mt-1">
                <span className="text-[10px] text-neutral-400 font-medium block">PURCHASE DATE</span>
                <span className="text-neutral-600 flex items-center gap-1 font-mono text-[11px]">
                  <Calendar size={11} className="text-neutral-400" />
                  {selectedAsset.purchaseDate}
                </span>
              </div>
              <div className="space-y-1 mt-1">
                <span className="text-[10px] text-neutral-400 font-medium block">WARRANTY EXPIRY</span>
                <span className="text-neutral-600 font-mono text-[11px]">
                  {selectedAsset.warrantyExpiry || "No Warranty"}
                </span>
              </div>
            </div>

            {/* Documents attached */}
            {selectedAsset.documents && selectedAsset.documents.length > 0 && (
              <div className="space-y-2 text-xs">
                <span className="text-[10px] text-neutral-400 font-bold block">VERIFIED MANUALS & PAPERS</span>
                <div className="space-y-1.5 font-semibold">
                  {selectedAsset.documents.map((doc, idx) => (
                    <a 
                      key={idx} 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert(`Downloading simulated file: ${doc}`); }}
                      className="flex items-center gap-2 p-2 rounded bg-neutral-50 hover:bg-neutral-100 border border-neutral-150 text-indigo-600"
                    >
                      <Files size={12} className="text-neutral-400" />
                      <span className="truncate">{doc}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Timeline Ledger</span>
                <Clock size={11} className="text-neutral-400" />
              </div>

              <div className="relative border-l-2 border-neutral-100 pl-4 space-y-4 max-h-60 overflow-y-auto">
                {selectedAssetTimeline.length === 0 ? (
                  <p className="text-[11px] text-neutral-400">No lifecycle log registered yet.</p>
                ) : (
                  selectedAssetTimeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 border border-white ring-2 ring-indigo-50"></span>
                      <p className="text-xs font-semibold text-neutral-700 leading-none">{item.title}</p>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{item.description}</p>
                      <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

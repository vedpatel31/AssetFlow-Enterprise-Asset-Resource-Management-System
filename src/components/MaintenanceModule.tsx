/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Wrench, Sparkles, CheckCircle2, AlertCircle, 
  Trash2, Send, Clock, User, UserCheck, ShieldCheck
} from "lucide-react";
import { User as UserType, UserRole, Asset, MaintenanceRequest, MaintenanceStatus } from "../types.js";

interface MaintenanceModuleProps {
  user: UserType;
  onActivityLogged: () => void;
}

export default function MaintenanceModule({ user, onActivityLogged }: MaintenanceModuleProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    assetId: "",
    description: ""
  });

  const [updateStatusForm, setUpdateStatusForm] = useState({
    requestId: "",
    status: MaintenanceStatus.APPROVED,
    technician: "",
    notes: ""
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isManager = user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAssets, resMaint, resEmps] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/maintenance"),
        fetch("/api/employees")
      ]);

      if (resAssets.ok) setAssets(await resAssets.json());
      if (resMaint.ok) setRequests(await resMaint.json());
      if (resEmps.ok) setEmployees(await resEmps.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.assetId || !form.description.trim()) {
      setErrorMsg("Please select a device and describe the defect.");
      return;
    }

    try {
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: form.assetId,
          reporterId: user.id,
          description: form.description.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      setSuccessMsg("Maintenance ticket submitted successfully! Device status locked to 'Under Maintenance'.");
      setForm({ assetId: "", description: "" });
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!updateStatusForm.requestId) return;

    try {
      const response = await fetch(`/api/maintenance/${updateStatusForm.requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateStatusForm.status,
          technician: updateStatusForm.technician.trim(),
          notes: updateStatusForm.notes.trim(),
          actorUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update workflow");
      }

      setSuccessMsg(`Workflow updated to: ${updateStatusForm.status}!`);
      setUpdateStatusForm({
        requestId: "",
        status: MaintenanceStatus.APPROVED,
        technician: "",
        notes: ""
      });
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview intro banner */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 font-display">Repairs & Maintenance Center</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Lodge hardware defects, assign technicians, track pipeline repair tasks, and verify safety status.
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold">
          <Wrench size={13} />
          <span>{requests.filter(r => r.status !== MaintenanceStatus.RESOLVED).length} Active Repairs</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-center gap-2 font-semibold font-mono">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <Sparkles size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lodge Ticket Form Column */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 space-y-4 h-fit">
          <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Lodge Repair Ticket</h4>
          
          <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-medium text-neutral-500">
            <div>
              <label className="block text-neutral-500 mb-1">Select Broken Device *</label>
              <select
                required
                value={form.assetId}
                onChange={e => setForm({ ...form, assetId: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 bg-white"
              >
                <option value="">Choose Device...</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.tag}] {a.name} ({a.condition})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Defect Description *</label>
              <textarea
                required
                placeholder="Describe screen flicker, battery drain, keyboard faults, structural damage..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 h-28 focus:outline-indigo-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              Lodge Hardware Defect
            </button>
          </form>

          {/* Quick Assign technician form for manager */}
          {isManager && updateStatusForm.requestId && (
            <div className="border-t border-neutral-150 pt-4 mt-2 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <h5 className="font-bold text-neutral-800 text-xs">Manage Repair Workflow</h5>
              <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs font-medium text-neutral-500">
                <div>
                  <label className="block text-neutral-400 mb-1">Change State *</label>
                  <select
                    value={updateStatusForm.status}
                    onChange={e => setUpdateStatusForm({ ...updateStatusForm, status: e.target.value as MaintenanceStatus })}
                    className="w-full p-2 border border-neutral-200 rounded bg-white text-neutral-800"
                  >
                    {Object.values(MaintenanceStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Assign Technician Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Miller (IT Hardware)"
                    value={updateStatusForm.technician}
                    onChange={e => setUpdateStatusForm({ ...updateStatusForm, technician: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Workflow Notes</label>
                  <input
                    type="text"
                    placeholder="Diagnostic reports, repair costs..."
                    value={updateStatusForm.notes}
                    onChange={e => setUpdateStatusForm({ ...updateStatusForm, notes: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded text-neutral-800"
                  />
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition text-[11px]"
                  >
                    Apply Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateStatusForm({ ...updateStatusForm, requestId: "" })}
                    className="px-2 py-2 bg-neutral-100 text-neutral-600 rounded hover:bg-neutral-200 transition text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Board Tickets Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Repair Pipeline Board</h4>

          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center p-12 text-neutral-400">
                <Wrench size={30} className="mx-auto text-neutral-300 mb-1" />
                <p className="text-xs font-semibold text-neutral-600">No active maintenance tickets logged.</p>
              </div>
            ) : (
              requests.map(req => {
                const asset = assets.find(a => a.id === req.assetId);
                const reporter = employees.find(emp => emp.id === req.reporterId);

                return (
                  <div 
                    key={req.id}
                    className={`p-4 border rounded-xl space-y-3 transition cursor-pointer hover:shadow-xs ${
                      updateStatusForm.requestId === req.id 
                        ? "border-indigo-600 bg-indigo-50/10 ring-1 ring-indigo-500" 
                        : "border-neutral-200 bg-neutral-50/50"
                    }`}
                    onClick={() => {
                      if (isManager) {
                        setUpdateStatusForm({
                          requestId: req.id,
                          status: req.status,
                          technician: req.technician || "",
                          notes: req.notes || ""
                        });
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-neutral-100 pb-2 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="font-mono text-[9px] font-bold text-neutral-400 px-1.5 py-0.5 rounded bg-white border border-neutral-200 uppercase shrink-0">
                          {asset ? asset.tag : "Asset"}
                        </span>
                        <span className="text-neutral-800">{asset ? asset.name : "Hardware"}</span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        req.status === MaintenanceStatus.PENDING
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : req.status === MaintenanceStatus.ASSIGNED
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          : req.status === MaintenanceStatus.IN_PROGRESS
                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                          : req.status === MaintenanceStatus.RESOLVED
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs space-y-2">
                      <p className="font-semibold text-neutral-700 leading-relaxed italic">
                        "{req.description}"
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-500 font-semibold border-t border-neutral-100/60 pt-2">
                        <p>Reporter: <span className="text-neutral-700">{reporter ? reporter.name : "Staff"}</span></p>
                        <p>Technician: <span className="text-neutral-700">{req.technician || "Unassigned"}</span></p>
                      </div>

                      {req.notes && (
                        <p className="p-2 rounded bg-white border border-neutral-150 text-[11px] text-neutral-600 font-medium">
                          <strong>Manager/Tech Notes:</strong> {req.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                      <span>Filed: {new Date(req.createdAt).toLocaleString()}</span>
                      {isManager && (
                        <span className="text-indigo-600 font-bold hover:underline">
                          {updateStatusForm.requestId === req.id ? "Editing..." : "Click to manage workflow"}
                        </span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

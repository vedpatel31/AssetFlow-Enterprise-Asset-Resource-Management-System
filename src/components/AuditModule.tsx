/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ClipboardCheck, Sparkles, CheckCircle2, AlertCircle, 
  User, Check, X, ShieldAlert, Lock, RefreshCw, BarChart 
} from "lucide-react";
import { 
  User as UserType, UserRole, Asset, AuditCycle, 
  AuditItem, AuditCycleStatus, AuditItemStatus 
} from "../types.js";

interface AuditModuleProps {
  user: UserType;
  onActivityLogged: () => void;
}

export default function AuditModule({ user, onActivityLogged }: AuditModuleProps) {
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<AuditCycle | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newCycleForm, setNewCycleForm] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split("T")[0]
  });

  const [auditorCheckForm, setAuditorCheckForm] = useState({
    assetId: "",
    status: AuditItemStatus.VERIFIED,
    notes: ""
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isAdmin = user.role === UserRole.ADMIN;
  const isAuditor = user.role !== UserRole.EMPLOYEE; // Admin, Mgr, Head can audit

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCycles, resAssets, resEmps] = await Promise.all([
        fetch("/api/audits"),
        fetch("/api/assets"),
        fetch("/api/employees")
      ]);

      if (resCycles.ok) {
        const allCycles: AuditCycle[] = await resCycles.json();
        setCycles(allCycles);
        
        // Auto-select latest active or completed cycle
        const active = allCycles.find(c => c.status === AuditCycleStatus.ACTIVE) || allCycles[0];
        if (active) {
          setActiveCycle(active);
          await fetchCycleItems(active.id);
        }
      }
      if (resAssets.ok) setAssets(await resAssets.json());
      if (resEmps.ok) setEmployees(await resEmps.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycleItems = async (cycleId: string) => {
    try {
      const res = await fetch(`/api/audits/${cycleId}/items`);
      if (res.ok) {
        setAuditItems(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLaunchAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newCycleForm.name || !newCycleForm.startDate || !newCycleForm.endDate) {
      setErrorMsg("Please complete all launch parameters.");
      return;
    }

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCycleForm,
          actorUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to launch audit cycle");
      }

      setSuccessMsg(`Audit cycle '${data.name}' launched successfully! Checklist items created for all assets.`);
      setNewCycleForm({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split("T")[0]
      });
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAuditVerify = async (assetId: string, status: AuditItemStatus, notes: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!activeCycle) return;

    try {
      const response = await fetch(`/api/audits/${activeCycle.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          status,
          notes: notes.trim(),
          actorUserId: user.id
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Verification failed");
      }

      setSuccessMsg("Evaluation submitted successfully!");
      fetchCycleItems(activeCycle.id);
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCloseAudit = async () => {
    if (!activeCycle) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(`/api/audits/${activeCycle.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to lock cycle");
      }

      setSuccessMsg("Audit cycle closed and locked! Discrepancy report saved, missing devices are now flagged as Lost.");
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSelectCycle = async (cycle: AuditCycle) => {
    setActiveCycle(cycle);
    await fetchCycleItems(cycle.id);
  };

  return (
    <div className="space-y-6">
      {/* Overview stats header */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 font-display">Inventory Audit Registry</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Generate 6-month cycles, assign auditors, verify hardware custody, and compile lockable discrepancy reports.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            onChange={e => {
              const cyc = cycles.find(c => c.id === e.target.value);
              if (cyc) handleSelectCycle(cyc);
            }}
            value={activeCycle?.id || ""}
            className="p-2 border border-neutral-200 rounded-lg text-xs font-semibold bg-neutral-50"
          >
            {cycles.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
            ))}
          </select>
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
        
        {/* Launch audit form: Admin only */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 h-fit space-y-4">
          <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Launch Audit Cycle</h4>
          
          {isAdmin ? (
            <form onSubmit={handleLaunchAudit} className="space-y-4 text-xs font-medium text-neutral-500">
              <div>
                <label className="block text-neutral-500 mb-1">Audit Cycle Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT Department Audit H2"
                  value={newCycleForm.name}
                  onChange={e => setNewCycleForm({ ...newCycleForm, name: e.target.value })}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newCycleForm.startDate}
                    onChange={e => setNewCycleForm({ ...newCycleForm, startDate: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newCycleForm.endDate}
                    onChange={e => setNewCycleForm({ ...newCycleForm, endDate: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                Launch Audit Cycle
              </button>
            </form>
          ) : (
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-center space-y-2">
              <ShieldAlert size={20} className="mx-auto text-neutral-400" />
              <p className="text-xs font-bold text-neutral-600">Admin Clearance Required</p>
              <p className="text-[10px] text-neutral-400">Only corporate administrators can launch company-wide audit cycles.</p>
            </div>
          )}

          {/* Locked / discrepancy report details */}
          {activeCycle && (
            <div className="border-t border-neutral-150 pt-4 space-y-3">
              <h5 className="font-bold text-neutral-800 text-xs flex items-center gap-1">
                <BarChart size={14} className="text-indigo-600" />
                Audit Discrepancy Statistics
              </h5>

              {activeCycle.status === AuditCycleStatus.COMPLETED && activeCycle.discrepancyReport ? (
                <div className="p-4 rounded-xl bg-neutral-900 text-neutral-200 space-y-2 text-xs font-mono">
                  <p className="text-amber-400 font-bold border-b border-neutral-800 pb-1 flex items-center gap-1 text-[11px]">
                    <Lock size={12} /> CYCLE CLOSED & LOCKED
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-neutral-300">
                    <p>TOTAL ITEMS: <span className="text-white font-bold">{activeCycle.discrepancyReport.totalAudited}</span></p>
                    <p>VERIFIED: <span className="text-emerald-400 font-bold">{activeCycle.discrepancyReport.verifiedCount}</span></p>
                    <p>DAMAGED: <span className="text-amber-400 font-bold">{activeCycle.discrepancyReport.damagedCount}</span></p>
                    <p>LOST/MISSING: <span className="text-rose-400 font-bold">{activeCycle.discrepancyReport.missingCount}</span></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-neutral-500">
                    Audit is currently open. Auditors are conducting evaluations. Once finished, Admin can close the review to lock data.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={handleCloseAudit}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                    >
                      Close & Lock Audit Cycle
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audit item checklist board */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-semibold text-neutral-800 text-sm">
              Checklist: {activeCycle ? activeCycle.name : "Auditing Checklist"}
            </h4>
            <span className="text-[10px] text-neutral-400 font-bold font-mono">
              {activeCycle ? `${activeCycle.startDate} to ${activeCycle.endDate}` : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-mono border-b border-neutral-100">
                  <th className="p-3">Asset Item</th>
                  <th className="p-3">Evaluation State</th>
                  <th className="p-3">Verified By</th>
                  <th className="p-3 text-right">Audit Evaluation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {auditItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-neutral-400">
                      No hardware checklist assigned to this cycle.
                    </td>
                  </tr>
                ) : (
                  auditItems.map(item => {
                    const asset = assets.find(a => a.id === item.assetId);
                    const auditor = employees.find(emp => emp.id === item.verifiedBy);
                    const isClosed = activeCycle?.status === AuditCycleStatus.COMPLETED;

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 uppercase border border-neutral-200 shrink-0">
                              {asset ? asset.tag : "Asset"}
                            </span>
                            <div>
                              <p className="font-semibold text-neutral-800">{asset ? asset.name : "Hardware"}</p>
                              {item.notes && <p className="text-[10px] text-neutral-400 italic">Notes: {item.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            item.status === AuditItemStatus.PENDING
                              ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                              : item.status === AuditItemStatus.VERIFIED
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : item.status === AuditItemStatus.DAMAGED
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-neutral-500 font-semibold text-[11px]">
                          {auditor ? auditor.name : "-"}
                        </td>
                        <td className="p-3 text-right">
                          {isClosed ? (
                            <span className="text-[10px] font-bold text-neutral-400 flex items-center justify-end gap-1">
                              <Lock size={10} /> Locked
                            </span>
                          ) : isAuditor ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleAuditVerify(item.assetId, AuditItemStatus.VERIFIED, "Physically intact")}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100"
                                title="Mark Verified"
                              >
                                Verified
                              </button>
                              <button
                                onClick={() => handleAuditVerify(item.assetId, AuditItemStatus.DAMAGED, "Repairs recommended")}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100"
                                title="Mark Damaged"
                              >
                                Damaged
                              </button>
                              <button
                                onClick={() => handleAuditVerify(item.assetId, AuditItemStatus.MISSING, "Missing from custody")}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg border border-rose-100"
                                title="Mark Missing"
                              >
                                Missing
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-bold">STAFF ONLY</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

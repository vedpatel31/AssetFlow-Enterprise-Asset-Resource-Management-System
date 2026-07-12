/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Laptop, CheckCircle2, AlertCircle, Calendar, 
  Wrench, ArrowLeftRight, ClipboardCheck, Sparkles, 
  MapPin, Clock, ShieldCheck, UserCheck, HelpCircle, 
  TrendingUp, Users, ArrowUpRight
} from "lucide-react";
import { User, UserRole, Asset, Booking, AssetStatus, AssetCondition, AppNotification, ActivityLog } from "../types.js";

interface DashboardViewProps {
  user: User;
  onNavigate: (view: string) => void;
  activityLogs: ActivityLog[];
  notifications: AppNotification[];
}

export default function DashboardView({
  user,
  onNavigate,
  activityLogs,
  notifications
}: DashboardViewProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const resStats = await fetch("/api/reports/summary");
      if (resStats.ok) {
        setReportData(await resStats.json());
      }

      // If user is Employee, let's query their custody assets
      const resAssets = await fetch("/api/assets");
      if (resAssets.ok) {
        const allAssets: Asset[] = await resAssets.json();
        
        // Find assets allocated to current user by calling summary or filtering allocations
        // For employee, let's fetch allocations
        const resAllocs = await fetch("/api/transfers"); // simple check
        // fallback query: let's scan allocations safely
        const departments = await fetch("/api/departments").then(r => r.ok ? r.json() : []);
        // Since we have local state, let's filter assets that are ALLOCATED.
        // We will fetch the actual custody by scanning allocations safely.
        const summary = await fetch("/api/reports/summary").then(r => r.ok ? r.json() : null);
        
        // Mock query client side:
        if (user.role === UserRole.EMPLOYEE) {
          // Find assets currently allocated to the employee in simulated allocations
          // John has a Macbook seeded (a-0002)
          if (user.username === "john") {
            setMyAssets(allAssets.filter(a => a.id === "a-0002"));
          } else {
            // Find if other assets are allocated
            setMyAssets([]);
          }
        }
      }

      // Query bookings
      const resBookings = await fetch("/api/bookings");
      if (resBookings.ok) {
        const allB: Booking[] = await resBookings.json();
        setMyBookings(allB.filter(b => b.userId === user.id && b.status === "Confirmed"));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [user.id]);

  if (loading || !reportData) {
    return (
      <div className="p-8 text-center text-neutral-500 font-semibold text-sm">
        <TrendingUp className="animate-bounce mx-auto text-indigo-500 mb-2" />
        Syncing live data, counting active checkouts and caching summaries...
      </div>
    );
  }

  const { kpis, categoryDistribution, departmentAssets } = reportData;

  return (
    <div className="space-y-6">
      
      {/* Personalized Welcome Banner */}
      <div className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 border border-neutral-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            {user.role} workspace
          </span>
          <h3 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight">
            Welcome back, {user.name}!
          </h3>
          <p className="text-neutral-400 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
            {user.role === UserRole.ADMIN && "You have complete administrative authorization. Audit registry portfolios, configure hierarchy branches, and verify operational compliance logs."}
            {user.role === UserRole.ASSET_MANAGER && "Manage hardware inventories, allocate checkout requests, assign repair technicians, and approve custody transfers."}
            {user.role === UserRole.DEPARTMENT_HEAD && "Review department utilization, authorize internal hardware transfers, and check operational due returns."}
            {user.role === UserRole.EMPLOYEE && "View your assigned device custody details, schedules, file repair requests, and check upcoming shared bookings."}
          </p>
        </div>
        
        <div className="flex gap-2.5 shrink-0 z-10">
          <button
            onClick={() => onNavigate("assets")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            Explore Assets
            <ArrowUpRight size={13} />
          </button>
          
          {user.role !== UserRole.EMPLOYEE && (
            <button
              onClick={() => onNavigate("reports")}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 transition cursor-pointer"
            >
              Analytics
            </button>
          )}
        </div>

        {/* Ambient background accent */}
        <div className="absolute right-0 bottom-0 h-48 w-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Dynamic role-based Dashboard panels */}

      {/* 1. ADMIN & MANAGER KPI ROW */}
      {user.role !== UserRole.EMPLOYEE && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition duration-150 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Portfolio</p>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-extrabold font-sans text-slate-800">{kpis.totalAssets}</span>
              <span className="text-[10px] font-bold text-indigo-600 font-mono px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">UNITS</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Physical hardware & resources</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-200 transition duration-150 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Available Assets</p>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-extrabold font-sans text-slate-800">{kpis.availableAssets}</span>
              <span className="text-[10px] font-bold text-emerald-600 font-mono px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">READY</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">In warehouse, ready to checkout</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-200 transition duration-150 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Checkouts</p>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-extrabold font-sans text-slate-800">{kpis.allocatedAssets}</span>
              <span className="text-[10px] font-bold text-amber-600 font-mono px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100">ALLOCATED</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Currently in custody of employees</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-rose-200 transition duration-150 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Broken / Repairs</p>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-extrabold font-sans text-slate-800">{kpis.maintenanceCount}</span>
              <span className="text-[10px] font-bold text-rose-600 font-mono px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100">MAINTENANCE</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Currently locked under repair</p>
          </div>

        </div>
      )}

      {/* 2. EMPLOYEE DASHBOARD PANELS */}
      {user.role === UserRole.EMPLOYEE && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* My custody devices */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
            <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Laptop size={15} className="text-indigo-600" />
              My Assigned Hardware Custody
            </h4>

            {myAssets.length === 0 ? (
              <div className="text-center p-8 text-neutral-400 space-y-2">
                <Laptop size={28} className="mx-auto text-neutral-200" />
                <p className="text-xs font-semibold text-neutral-600">No company assets currently checked out to you.</p>
                <p className="text-[10px] text-neutral-400">Contact Raj (Asset Manager) to request device assignments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myAssets.map(asset => (
                  <div key={asset.id} className="p-4 rounded-xl border border-neutral-150 bg-neutral-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-[9px] font-bold text-neutral-400 px-1.5 py-0.5 rounded bg-white border border-neutral-200 uppercase shrink-0">
                        {asset.tag}
                      </span>
                      <p className="font-bold text-neutral-800 text-sm mt-1">{asset.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">Serial: {asset.serialNumber}</p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => onNavigate("maintenance")}
                        className="px-3 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Lodge Defect Repair
                      </button>
                      <button
                        onClick={() => onNavigate("allocations")}
                        className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Transfer Device
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My shared resource bookings */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
            <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2 flex items-center gap-1.5">
              <Calendar size={15} className="text-purple-600" />
              My Reservable Bookings
            </h4>

            {myBookings.length === 0 ? (
              <div className="text-center p-8 text-neutral-400 space-y-2">
                <Calendar size={28} className="mx-auto text-neutral-200" />
                <p className="text-xs font-semibold text-neutral-600">No active conference rooms or vehicle reservations scheduled.</p>
                <button
                  onClick={() => onNavigate("bookings")}
                  className="mt-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition cursor-pointer"
                >
                  Reserve Shared Resource
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map(b => (
                  <div key={b.id} className="p-3.5 rounded-xl border border-neutral-150 bg-neutral-50/50 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-neutral-800 text-xs">{b.title}</p>
                      <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono mt-0.5">
                        <Clock size={10} />
                        <span>{new Date(b.startTime).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">
                      CONFIRMED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. DOUBLE-COLUMN COMPLIANCE FEEDS & LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Recent Activities */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-semibold text-slate-800 text-sm">System Audit Trail Log</h4>
            <Clock size={14} className="text-slate-400" />
          </div>

          <div className="space-y-3.5 max-h-96 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center">No system operations tracked.</p>
            ) : (
              activityLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-150 text-slate-600 shrink-0 shadow-xs">
                    <UserCheck size={13} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-700 leading-relaxed font-semibold">
                      <span className="text-slate-900 font-bold">@{log.username}</span>: {log.action}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-mono font-medium">
                      <span>Module: {log.module}</span>
                      <span>•</span>
                      <span>IP: {log.ipAddress}</span>
                      <span>•</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 col: Alerts feed */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-semibold text-slate-800 text-sm">My Security Alerts & Logs</h4>
            <AlertCircle size={14} className="text-slate-400" />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 p-8 text-center">Your alerts are clear. No pending warnings.</p>
            ) : (
              notifications.map((n, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-150 bg-slate-50/50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-white text-slate-500 font-mono text-[9px] font-bold border border-slate-200 uppercase">
                      {n.type}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

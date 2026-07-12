/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  BarChart3, FileSpreadsheet, FileText, TrendingUp, 
  Users, Wrench, Calendar, Sparkles, CheckCircle 
} from "lucide-react";
import { User, UserRole } from "../types.js";

interface ReportsModuleProps {
  user: User;
}

export default function ReportsModule({ user }: ReportsModuleProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reports/summary");
      if (response.ok) {
        setReportData(await response.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Export to CSV helper
  const handleExportCSV = (datasetName: string, headers: string[], keys: string[], rows: any[]) => {
    if (!rows || rows.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    
    rows.forEach(row => {
      const line = keys.map(key => {
        const val = row[key];
        return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
      });
      csvContent += line.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AssetFlow_${datasetName}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !reportData) {
    return (
      <div className="p-8 text-center text-neutral-500 font-semibold text-sm">
        <TrendingUp className="animate-bounce mx-auto text-indigo-500 mb-2" />
        Compiling organizational summaries, utilization scores and maintenance logs...
      </div>
    );
  }

  const { kpis, categoryDistribution, departmentAssets, bookingStatistics, maintenanceFrequency } = reportData;

  // Calculate high-level utilization rate
  const total = kpis.totalAssets || 1;
  const allocated = kpis.allocatedAssets || 0;
  const utilizationRate = Math.round((allocated / total) * 100);

  return (
    <div className="space-y-6">
      
      {/* Intro row */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 font-display">System Analytics & Reports</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Audit inventory utilization, track depreciation parameters, analyze shared room bookings, and export logs.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleExportCSV(
              "Department_Valuations", 
              ["Department", "Staff Count", "Assigned Assets", "Total Valuation (USD)"],
              ["departmentName", "employeeCount", "allocatedAssetCount", "costValuation"],
              departmentAssets
            )}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <FileText size={14} />
            Print PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-1">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Inventory Utilization</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold font-display text-neutral-800">{utilizationRate}%</span>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp size={12} />
              Healthy
            </span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${utilizationRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-1">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Active Bookings</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold font-display text-neutral-800">{kpis.activeBookingsCount}</span>
            <span className="text-xs text-indigo-600 font-semibold">Confirmed</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium">Shared conference rooms & vehicles</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-1">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Pending Transfer Approvals</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold font-display text-neutral-800">{kpis.pendingApprovals}</span>
            <span className="text-xs text-amber-600 font-semibold">Action Needed</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium">Department Head & Asset manager seals</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-1">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Under Maintenance Today</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold font-display text-neutral-800">{kpis.maintenanceCount}</span>
            <span className="text-xs text-rose-500 font-semibold">Locked</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium">In-repair hardware locked assets</p>
        </div>

      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department SUMMARY */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-semibold text-neutral-800 text-sm">Department Asset Valuations</h4>
            <Users size={14} className="text-neutral-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 uppercase font-mono border-b border-neutral-100">
                  <th className="p-2.5">Department</th>
                  <th className="p-2.5 text-center">Staff Count</th>
                  <th className="p-2.5 text-center">Assigned Assets</th>
                  <th className="p-2.5 text-right">Total Cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                {departmentAssets.map((dept: any, idx: number) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="p-2.5 font-bold text-neutral-800">{dept.departmentName}</td>
                    <td className="p-2.5 text-center text-neutral-500">{dept.employeeCount}</td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">{dept.allocatedAssetCount}</span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-neutral-900">${dept.costValuation.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category distribution */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-semibold text-neutral-800 text-sm">Asset Catalog Mix</h4>
            <BarChart3 size={14} className="text-indigo-600" />
          </div>

          <div className="space-y-4">
            {categoryDistribution.map((cat: any, idx: number) => {
              const maxVal = Math.max(...categoryDistribution.map((c: any) => c.count), 1);
              const percentage = Math.round((cat.count / maxVal) * 100);
              return (
                <div key={idx} className="space-y-1.5 text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700 font-bold">{cat.categoryName}</span>
                    <span className="text-neutral-500">{cat.count} units</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking heat summary */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-semibold text-neutral-800 text-sm">Shared Resource Booking Heatmap</h4>
            <Calendar size={14} className="text-neutral-400" />
          </div>

          <div className="space-y-3">
            {bookingStatistics.length === 0 ? (
              <p className="text-xs text-neutral-400 p-8 text-center">No reservable assets tracked.</p>
            ) : (
              bookingStatistics.map((stat: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-neutral-150 rounded-lg bg-neutral-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-neutral-400 px-1.5 py-0.5 rounded bg-white border border-neutral-200 uppercase">
                      {stat.assetTag}
                    </span>
                    <span className="text-neutral-700">{stat.assetName}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                    {stat.bookingsCount} reservations
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maintenance frequency */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-semibold text-neutral-800 text-sm">Hardware Defect Rate</h4>
            <Wrench size={14} className="text-neutral-400" />
          </div>

          <div className="space-y-3">
            {maintenanceFrequency.length === 0 ? (
              <div className="text-center text-xs text-neutral-400 p-12">
                <CheckCircle size={28} className="mx-auto text-emerald-500 mb-1" />
                No defect logs reported in the registry. System is 100% operational!
              </div>
            ) : (
              maintenanceFrequency.map((stat: any, idx: number) => (
                <div key={idx} className="p-3 border border-neutral-150 rounded-lg bg-rose-50/20 text-xs font-semibold flex items-center justify-between">
                  <div>
                    <p className="text-neutral-700">{stat.assetName}</p>
                    <span className="text-[10px] text-neutral-400 font-mono">{stat.assetTag}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-700 font-bold">{stat.totalTickets} defect tickets</p>
                    <p className="text-[9px] text-emerald-600 font-bold">{stat.resolvedTickets} resolved</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

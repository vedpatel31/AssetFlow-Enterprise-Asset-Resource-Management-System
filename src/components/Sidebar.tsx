/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  LayoutDashboard, Building2, Laptop, ArrowLeftRight, 
  CalendarRange, Wrench, ClipboardCheck, BarChart3, 
  History, ShieldAlert, LogOut, Menu, X, ShieldCheck
} from "lucide-react";
import { User, UserRole } from "../types.js";

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  user: User | null;
  logout: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  currentView,
  setView,
  user,
  logout,
  collapsed,
  setCollapsed
}: SidebarProps) {
  if (!user) return null;

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE] },
    { id: "organization", label: "Organization", icon: Building2, roles: [UserRole.ADMIN] },
    { id: "assets", label: "Asset Registry", icon: Laptop, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE] },
    { id: "allocations", label: "Checkout & Transfer", icon: ArrowLeftRight, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE] },
    { id: "bookings", label: "Resource Booking", icon: CalendarRange, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE] },
    { id: "maintenance", label: "Repairs & Maintenance", icon: Wrench, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE] },
    { id: "audit", label: "Inventory Audit", icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE] },
    { id: "reports", label: "Analytics & Reports", icon: BarChart3, roles: [UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD] },
    { id: "activity", label: "Audit Logs", icon: History, roles: [UserRole.ADMIN] }
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside 
      className={`sticky top-0 left-0 h-screen bg-slate-900 text-slate-200 transition-all duration-300 flex flex-col z-40 border-r border-slate-850 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white font-display text-lg tracking-wider">
              AF
            </div>
            <span className="font-display font-semibold text-lg text-white tracking-wide">
              AssetFlow
            </span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white font-display text-lg mx-auto">
            AF
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* User Card */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-850 flex items-center justify-center border border-slate-850 text-indigo-400 font-semibold shrink-0">
          {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
        </div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <h4 className="text-sm font-medium text-white truncate">{user.name}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              {user.role === UserRole.ADMIN ? (
                <ShieldAlert size={12} className="text-amber-500 shrink-0" />
              ) : (
                <ShieldCheck size={12} className="text-indigo-400 shrink-0" />
              )}
              <span className="text-xs text-slate-400 font-medium truncate">{user.role}</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {allowedItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${
                isActive 
                  ? "bg-white/5 text-white font-semibold border-r-3 border-indigo-500" 
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer Log Out */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

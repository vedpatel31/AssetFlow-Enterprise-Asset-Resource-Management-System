/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Lock, Mail, User as UserIcon, ShieldCheck, 
  Sparkles, CheckCircle2, AlertCircle, RefreshCw, KeyRound 
} from "lucide-react";
import { User, UserRole, AppNotification, ActivityLog } from "./types.js";

// Import custom layout sub-modules
import Sidebar from "./components/Sidebar.js";
import Header from "./components/Header.js";
import DashboardView from "./components/DashboardView.js";
import OrgModule from "./components/OrgModule.js";
import AssetModule from "./components/AssetModule.js";
import AllocationModule from "./components/AllocationModule.js";
import BookingModule from "./components/BookingModule.js";
import MaintenanceModule from "./components/MaintenanceModule.js";
import AuditModule from "./components/AuditModule.js";
import ReportsModule from "./components/ReportsModule.js";

export default function App() {
  // Authentication & Session
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authScreen, setAuthScreen] = useState<"login" | "signup" | "forgot">("login");
  const [loginPortal, setLoginPortal] = useState<"Employee" | "Admin">("Admin");
  
  // Navigation & Sizing
  const [currentView, setView] = useState<string>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Lists & Dynamic Feeds
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Form parameters
  const [loginForm, setLoginForm] = useState({ usernameOrEmail: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", username: "", password: "", departmentId: "", role: "Employee" });
  const [forgotEmail, setForgotEmail] = useState("");

  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [adminStatus, setAdminStatus] = useState({ adminExists: true, adminLoggedInAtLeastOnce: true });

  const fetchAuthStatus = () => {
    fetch("/api/auth/status")
      .then(r => r.ok ? r.json() : { adminExists: true, adminLoggedInAtLeastOnce: true })
      .then(data => setAdminStatus(data))
      .catch(err => console.error(err));
  };

  const loadDepartments = () => {
    fetch("/api/departments")
      .then(r => r.ok ? r.json() : [])
      .then(data => setDepartments(data.filter((d: any) => d.isActive)))
      .catch(err => console.error(err));
  };

  // Auto load configurations & active session
  useEffect(() => {
    // If there is an existing session in localStorage, retrieve it
    const storedUser = localStorage.getItem("assetflow_user");
    const storedToken = localStorage.getItem("assetflow_token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }

    loadDepartments();
    fetchAuthStatus();
  }, []);

  const refreshFeeds = async () => {
    if (!user) return;
    try {
      const [resNotif, resLogs] = await Promise.all([
        fetch(`/api/notifications?userId=${user.id}`),
        fetch("/api/activity-logs")
      ]);
      if (resNotif.ok) setNotifications(await resNotif.json());
      if (resLogs.ok) setActivityLogs(await resLogs.json());
    } catch (err) {
      console.error("Failed to sync audit logs and alert feeds", err);
    }
  };

  useEffect(() => {
    refreshFeeds();
    const interval = setInterval(refreshFeeds, 5000); // Poll feeds every 5s for realtime emulation
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!loginForm.usernameOrEmail || !loginForm.password) {
      setAuthError("Please fill out both credentials.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: loginForm.usernameOrEmail,
          password: loginForm.password,
          expectedRole: loginPortal
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      localStorage.setItem("assetflow_user", JSON.stringify(data.user));
      localStorage.setItem("assetflow_token", data.token);
      
      setUser(data.user);
      setToken(data.token);
      setView("dashboard");
      setLoginForm({ usernameOrEmail: "", password: "" });
      fetchAuthStatus();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleResetDb = async (mode: "blank" | "seeded") => {
    setAuthError("");
    setAuthSuccess("");
    try {
      const response = await fetch("/api/dev/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Reset failed");
      }
      setAuthSuccess(data.message);
      loadDepartments();
      fetchAuthStatus();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!signupForm.name || !signupForm.email || !signupForm.username || !signupForm.password) {
      setAuthError("All signup fields are required.");
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Signup failed.");
      }

      setAuthSuccess(`Account created successfully with the selected role! You can now sign in using the appropriate login portal.`);
      setAuthScreen("login");
      setSignupForm({ name: "", email: "", username: "", password: "", departmentId: "", role: "Employee" });
      fetchAuthStatus();
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!forgotEmail) return;

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Password reset failed.");
      }

      setAuthSuccess(data.message);
      setForgotEmail("");
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("assetflow_user");
    localStorage.removeItem("assetflow_token");
    setUser(null);
    setToken(null);
    setView("dashboard");
  };

  // Auth Layouts:
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        
        {/* Brand Display Header */}
        <div className="flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white font-sans text-xl tracking-wider shadow-md shadow-indigo-100">
            AF
          </div>
          <h1 className="font-sans font-bold text-2xl text-slate-800 tracking-tight">
            AssetFlow <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 ml-1">Enterprise Suite</span>
          </h1>
        </div>

        {/* Auth Module Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 w-full max-w-md shadow-xl relative overflow-hidden transition-all duration-300">
          
          {authError && (
            <div className="mb-4 p-3.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle size={15} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs flex items-center gap-2 font-semibold font-sans">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Separate Login Portals Tab Switcher */}
          {authScreen === "login" && !adminStatus.adminLoggedInAtLeastOnce && (
            <div className="mb-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mb-2">Select Access Portal</p>
              <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => { setLoginPortal("Employee"); setAuthError(""); setAuthSuccess(""); }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition duration-150 flex items-center justify-center gap-1.5 ${
                    loginPortal === "Employee"
                      ? "bg-white text-indigo-600 shadow-xs border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>💼</span> Employee Workspace
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginPortal("Admin"); setAuthError(""); setAuthSuccess(""); }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition duration-150 flex items-center justify-center gap-1.5 ${
                    loginPortal === "Admin"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>🛡️</span> Admin Console
                </button>
              </div>
            </div>
          )}

          {/* Login Screen Form */}
          {authScreen === "login" && (
            <div className="space-y-5">
              <div className="text-center">
                {adminStatus.adminLoggedInAtLeastOnce ? (
                  <>
                    <h3 className="font-sans font-bold text-lg text-slate-900">Enterprise Unified Login</h3>
                    <p className="text-xs text-slate-400 mt-1">Access your assigned hardware, view department requests, or manage administrative tasks.</p>
                  </>
                ) : loginPortal === "Admin" ? (
                  <>
                    <h3 className="font-sans font-bold text-lg text-slate-900">Admin & Manager Login</h3>
                    <p className="text-xs text-slate-400 mt-1">Authorized portfolio controls, audits, and department setups</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-sans font-bold text-lg text-slate-900">Employee Login</h3>
                    <p className="text-xs text-slate-400 mt-1">Access your assigned hardware, book resources, and request repairs</p>
                  </>
                )}
              </div>

              <form onSubmit={handleLogin} className="space-y-4 text-xs font-medium text-slate-500">
                <div>
                  <label className="block text-slate-500 mb-1">Corporate Email or Username</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder={adminStatus.adminLoggedInAtLeastOnce ? "e.g. admin, priya, or employee@company.com" : (loginPortal === "Admin" ? "e.g. admin or raj" : "e.g. john or employee@assetflow.com")}
                      value={loginForm.usernameOrEmail}
                      onChange={e => setLoginForm({ ...loginForm, usernameOrEmail: e.target.value })}
                      className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setAuthScreen("forgot"); setAuthError(""); setAuthSuccess(""); }}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-lg font-bold shadow-xs transition duration-150 ${
                      adminStatus.adminLoggedInAtLeastOnce 
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : loginPortal === "Admin" 
                        ? "bg-slate-900 hover:bg-slate-800 text-white" 
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    Enter Portal
                  </button>
                </div>
              </form>

              {/* Roles Tip Panel */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <ShieldCheck size={13} className="text-indigo-600 shrink-0" />
                  <span>Sandbox Testing Credentials</span>
                </div>
                {adminStatus.adminLoggedInAtLeastOnce ? (
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div>
                      <p className="font-bold text-slate-600 mb-0.5">ADMINISTRATIVE</p>
                      <p>• Admin: <span className="text-slate-700 font-mono">admin / admin123</span></p>
                      <p>• Manager: <span className="text-slate-700 font-mono">raj / password123</span></p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-600 mb-0.5">STAFF & DEPTS</p>
                      <p>• Staff: <span className="text-slate-700 font-mono">john / password123</span></p>
                      <p>• Head: <span className="text-slate-700 font-mono">priya / password123</span></p>
                    </div>
                  </div>
                ) : loginPortal === "Admin" ? (
                  <div>
                    <p>• Admin: <strong className="text-slate-700 font-mono">admin</strong> / <span className="text-slate-600 font-mono">admin123</span></p>
                    <p>• Asset Manager: <strong className="text-slate-700 font-mono">raj</strong> / <span className="text-slate-600 font-mono">password123</span></p>
                  </div>
                ) : (
                  <div>
                    <p>• Employee: <strong className="text-slate-700 font-mono">john</strong> / <span className="text-slate-600 font-mono">password123</span></p>
                    <p>• Department Head: <strong className="text-slate-700 font-mono">priya</strong> / <span className="text-slate-600 font-mono">password123</span></p>
                  </div>
                )}
              </div>

              <div className="text-center border-t border-slate-100 pt-3 flex flex-col gap-1">
                <p className="text-slate-400 text-xs">
                  Need an account?{" "}
                  <button
                    onClick={() => { 
                      setAuthScreen("signup"); 
                      setAuthError(""); 
                      setAuthSuccess(""); 
                      setSignupForm({ name: "", email: "", username: "", password: "", departmentId: "", role: adminStatus.adminLoggedInAtLeastOnce ? "Employee" : (loginPortal === "Admin" ? "Admin" : "Employee") });
                    }}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Register New Account
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Signup Screen Form */}
          {authScreen === "signup" && (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="font-sans font-bold text-lg text-slate-900">Proper User Registration</h3>
                <p className="text-xs text-slate-400 mt-1">Provision administrative or staff logins for your enterprise portfolio</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-3.5 text-xs font-medium text-slate-500">
                <div>
                  <label className="block text-slate-500 mb-1">Select Account Class / Role *</label>
                  <select
                    value={signupForm.role}
                    onChange={e => setSignupForm({ ...signupForm, role: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Employee">💼 Employee (Standard Staff Member)</option>
                    <option value="Admin">🛡️ Admin (System Owner & Administrator)</option>
                    <option value="Asset Manager">🔧 Asset Manager (Logistics & Inventory)</option>
                    <option value="Department Head">👥 Department Head (Supervisor)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {signupForm.role === "Admin" && "Full administrative permissions: edit departments, assets, and audit states."}
                    {signupForm.role === "Asset Manager" && "Inventory-focused: check out items, track transfers, resolve repair tickets."}
                    {signupForm.role === "Department Head" && "Department level authority: approve internal transfers, request new equipment."}
                    {signupForm.role === "Employee" && "Standard permissions: request assets, report damages, reserve shared slots."}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Full Name *</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel Green"
                      value={signupForm.name}
                      onChange={e => setSignupForm({ ...signupForm, name: e.target.value })}
                      className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Corporate Email Address *</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={signupForm.email}
                      onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                      className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="rachel"
                      value={signupForm.username}
                      onChange={e => setSignupForm({ ...signupForm, username: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Initial Department</label>
                    <select
                      value={signupForm.departmentId}
                      onChange={e => setSignupForm({ ...signupForm, departmentId: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-semibold"
                    >
                      <option value="">None / Unassigned</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Password *</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={signupForm.password}
                      onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                      className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthScreen("login"); setAuthError(""); setAuthSuccess(""); }}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition duration-150"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Forgot Password Screen */}
          {authScreen === "forgot" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center">
                <h3 className="font-sans font-bold text-lg text-slate-900">Reset Credentials</h3>
                <p className="text-xs text-slate-400 mt-1">Enter your email and retrieve password access instructions.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs font-medium text-slate-500">
                <div>
                  <label className="block text-slate-500 mb-1">Corporate Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@assetflow.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg text-slate-800 focus:outline-indigo-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setAuthScreen("login"); setAuthError(""); setAuthSuccess(""); }}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition"
                  >
                    Retrieve Instructions
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Enterprise Database State Control Hub */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mb-2.5">🛠️ Sandbox State Controller</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleResetDb("blank")}
                className="py-2 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200/50 transition font-bold text-center flex flex-col items-center justify-center gap-0.5"
                title="Wipes all existing users, assets, departments, etc. to let you register an admin & user from clean state"
              >
                <span>🗑️ Wipe to Blank</span>
                <span className="text-[8px] text-rose-500 font-normal">Test Empty Setup Flows</span>
              </button>
              <button
                type="button"
                onClick={() => handleResetDb("seeded")}
                className="py-2 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200/50 transition font-bold text-center flex flex-col items-center justify-center gap-0.5"
                title="Repopulates live portfolios, bookings, schedules, and active logs"
              >
                <span>⚡ Seed Sample Data</span>
                <span className="text-[8px] text-emerald-500 font-normal">Test With Corporate Data</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-2">
              Allows you to simulate completely empty databases instantly to test initial setups!
            </p>
          </div>

        </div>
        
        {/* Humble footer */}
        <p className="text-[10px] text-slate-400 mt-6 font-sans">
          AssetFlow Enterprise • Professional Asset Management Suite
        </p>

      </div>
    );
  }

  // --- MAIN APP WORKSPACE VIEW ROUTING ---
  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard": return "Organizational Overview Dashboard";
      case "organization": return "Enterprise Hierarchy & Access Settings";
      case "assets": return "Hardware Inventory & Warranty Portfolio";
      case "allocations": return "Hardware Checkout & Transfers Matrix";
      case "bookings": return "Shared Conference Rooms & Fleets Scheduler";
      case "maintenance": return "Wrench: Hardware Repairs & Technician Tickets";
      case "audit": return "Company Physical Auditing Cycle Logs";
      case "reports": return "Analytical Trends & Export CSV/PDF Reports";
      case "activity": return "Administrative System Operations logs";
      default: return "Enterprise Resource Workspace";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      
      {/* Sidebar Navigation Panel */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        user={user}
        logout={handleLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        
        {/* Sticky Header */}
        <Header
          user={user}
          notifications={notifications}
          refreshNotifications={refreshFeeds}
          title={getViewTitle()}
        />

        {/* Scrollable Workspace Stage */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {currentView === "dashboard" && (
            <DashboardView
              user={user}
              onNavigate={setView}
              activityLogs={activityLogs}
              notifications={notifications}
            />
          )}

          {currentView === "organization" && (
            <OrgModule
              user={user}
              onActivityLogged={refreshFeeds}
            />
          )}

          {currentView === "assets" && (
            <AssetModule
              user={user}
              onActivityLogged={refreshFeeds}
            />
          )}

          {currentView === "allocations" && (
            <AllocationModule
              user={user}
              onActivityLogged={refreshFeeds}
            />
          )}

          {currentView === "bookings" && (
            <BookingModule
              user={user}
              onActivityLogged={refreshFeeds}
            />
          )}

          {currentView === "maintenance" && (
            <MaintenanceModule
              user={user}
              onActivityLogged={refreshFeeds}
            />
          )}

          {currentView === "audit" && (
            <AuditModule
              user={user}
              onActivityLogged={refreshFeeds}
            />
          )}

          {currentView === "reports" && (
            <ReportsModule
              user={user}
            />
          )}

          {currentView === "activity" && (
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-4">
              <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Complete System Audit Trail</h4>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs border-b border-neutral-50 pb-3">
                    <div className="p-1.5 rounded bg-neutral-50 text-neutral-500 font-mono text-[9px] font-bold border border-neutral-200 uppercase shrink-0">
                      {log.module}
                    </div>
                    <div className="flex-1">
                      <p className="text-neutral-700 leading-relaxed font-semibold">
                        <strong className="text-neutral-900">@{log.username}</strong> ({log.userId}) performed: {log.action}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-neutral-400 font-mono">
                        <span>IP Address: {log.ipAddress}</span>
                        <span>•</span>
                        <span>Time: {new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}

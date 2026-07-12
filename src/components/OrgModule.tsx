/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, Plus, UserCheck, ShieldAlert, 
  Trash2, Edit, AlertCircle, Search, Sparkles, UserMinus
} from "lucide-react";
import { User, UserRole, Department, AssetCategory } from "../types.js";

interface OrgModuleProps {
  user: User;
  onActivityLogged: () => void;
}

export default function OrgModule({ user, onActivityLogged }: OrgModuleProps) {
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "employees">("departments");
  
  // States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading & Alerts
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Form States
  const [deptForm, setDeptForm] = useState({ name: "", parentId: "", headId: "" });
  const [categoryName, setCategoryName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDepts, resCats, resEmps] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/categories"),
        fetch("/api/employees")
      ]);
      if (resDepts.ok) setDepartments(await resDepts.json());
      if (resCats.ok) setCategories(await resCats.json());
      if (resEmps.ok) setEmployees(await resEmps.json());
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to the organization directories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;

    setErrorMsg("");
    setSuccessMsg("");
    try {
      const url = editingDeptId ? `/api/departments/${editingDeptId}` : "/api/departments";
      const method = editingDeptId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...deptForm,
          actorUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to persist department");
      }

      setSuccessMsg(editingDeptId ? "Department updated successfully!" : "Department created successfully!");
      setDeptForm({ name: "", parentId: "", headId: "" });
      setEditingDeptId(null);
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName.trim(),
          actorUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to persist asset category");
      }

      setSuccessMsg("Asset Category registered successfully!");
      setCategoryName("");
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePromote = async (targetUserId: string, role: UserRole) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/auth/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          newRole: role,
          adminUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Role promotion failed");
      }

      setSuccessMsg("Role changed successfully!");
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleUserStatus = async (targetUserId: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/auth/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          adminUserId: user.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Status toggle failed");
      }

      setSuccessMsg("User status updated successfully!");
      fetchData();
      onActivityLogged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const toggleDeptStatus = async (deptId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/departments/${deptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !currentStatus,
          actorUserId: user.id
        })
      });
      if (response.ok) {
        setSuccessMsg("Department status toggled!");
        fetchData();
        onActivityLogged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCatStatus = async (catId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/categories/${catId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !currentStatus,
          actorUserId: user.id
        })
      });
      if (response.ok) {
        setSuccessMsg("Category status toggled!");
        fetchData();
        onActivityLogged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Intro card */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 font-display">Organization & Directory</h3>
          <p className="text-sm text-neutral-500 mt-1">
            Setup corporate departments, manage catalog asset categories, promote employees and maintain operational logs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "departments" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "categories" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Asset Categories
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "employees" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Employee Directory
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-sm flex items-center gap-2">
          <Sparkles size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Panel Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel for Adding / Editing (only for Depts and Categories) */}
        {activeTab !== "employees" && (
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-neutral-200 h-fit space-y-4">
            <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">
              {activeTab === "departments" 
                ? (editingDeptId ? "Edit Department" : "Add Department")
                : "Add Asset Category"
              }
            </h4>

            {activeTab === "departments" ? (
              <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT, Finance"
                    value={deptForm.name}
                    onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Parent Department (Optional)</label>
                  <select
                    value={deptForm.parentId}
                    onChange={e => setDeptForm({ ...deptForm, parentId: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-indigo-600 bg-white font-medium"
                  >
                    <option value="">None (Top Level)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Assign Head of Department</label>
                  <select
                    value={deptForm.headId}
                    onChange={e => setDeptForm({ ...deptForm, headId: e.target.value })}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-indigo-600 bg-white font-medium"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.email} ({emp.role})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Assigning a department head grants them full managerial permissions. They can log in with their email address/username and receive direct authorization.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                  >
                    {editingDeptId ? "Update Department" : "Register Department"}
                  </button>
                  {editingDeptId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDeptId(null);
                        setDeptForm({ name: "", parentId: "", headId: "" });
                      }}
                      className="px-3 py-2.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laptop, Vehicle, Printer"
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg outline-indigo-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition pt-2"
                >
                  Register Category
                </button>
              </form>
            )}
          </div>
        )}

        {/* Right Directory Panel */}
        <div className={`${activeTab === "employees" ? "lg:col-span-3" : "lg:col-span-2"} bg-white p-6 rounded-xl border border-neutral-200 overflow-hidden`}>
          
          {activeTab === "departments" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Department Structure</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-mono border-b border-neutral-100">
                      <th className="p-3">Department Name</th>
                      <th className="p-3">Parent Department</th>
                      <th className="p-3">Department Head</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-400">No departments configured yet.</td>
                      </tr>
                    ) : (
                      departments.map(dept => {
                        const parent = departments.find(d => d.id === dept.parentId);
                        const head = employees.find(e => e.id === dept.headId);
                        return (
                          <tr key={dept.id} className="hover:bg-neutral-50/50">
                            <td className="p-3 font-semibold text-neutral-800">{dept.name}</td>
                            <td className="p-3 text-neutral-500">{parent ? parent.name : "Top-Level"}</td>
                            <td className="p-3">
                              {head ? (
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{head.name}</span>
                              ) : (
                                <span className="text-neutral-400">Vacant</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleDeptStatus(dept.id, dept.isActive)}
                                className={`px-2 py-1 rounded text-[10px] font-bold ${
                                  dept.isActive 
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                                    : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                                }`}
                              >
                                {dept.isActive ? "ACTIVE" : "INACTIVE"}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingDeptId(dept.id);
                                  setDeptForm({
                                    name: dept.name,
                                    parentId: dept.parentId || "",
                                    headId: dept.headId || ""
                                  });
                                }}
                                className="p-1.5 text-neutral-400 hover:text-indigo-600 rounded hover:bg-neutral-100"
                              >
                                <Edit size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-800 text-sm border-b border-neutral-100 pb-2">Asset Catalog Categories</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-mono border-b border-neutral-100">
                      <th className="p-3">Category Name</th>
                      <th className="p-3">Created On</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {categories.map(cat => (
                      <tr key={cat.id} className="hover:bg-neutral-50/50">
                        <td className="p-3 font-semibold text-neutral-800">{cat.name}</td>
                        <td className="p-3 text-neutral-400">{new Date(cat.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleCatStatus(cat.id, cat.isActive)}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              cat.isActive 
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                                : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                            }`}
                          >
                            {cat.isActive ? "ACTIVE" : "INACTIVE"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "employees" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <h4 className="font-semibold text-neutral-800 text-sm">Employee Directory & Access Matrix</h4>
                
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search name, username, email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs p-2.5 pl-9 border border-neutral-200 rounded-lg outline-indigo-600 bg-neutral-50"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-mono border-b border-neutral-100">
                      <th className="p-3">Name</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">Applet Status</th>
                      <th className="p-3 text-right">Access Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {filteredEmployees.map(emp => {
                      const dept = departments.find(d => d.id === emp.departmentId);
                      return (
                        <tr key={emp.id} className="hover:bg-neutral-50/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 border border-neutral-200 uppercase">
                                {emp.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-800">{emp.name}</p>
                                <p className="text-[10px] text-neutral-400 font-mono">@{emp.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-neutral-600">{emp.email}</td>
                          <td className="p-3">
                            {dept ? (
                              <span className="font-semibold text-neutral-700">{dept.name}</span>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.role === UserRole.ADMIN 
                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                : emp.role === UserRole.ASSET_MANAGER 
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : emp.role === UserRole.DEPARTMENT_HEAD
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                            }`}>
                              {emp.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              emp.isActive 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}>
                              <span className={`h-1 w-1 rounded-full ${emp.isActive ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                              {emp.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Promoting Controls */}
                              {emp.role !== UserRole.ADMIN && (
                                <select
                                  value={emp.role}
                                  onChange={e => handlePromote(emp.id, e.target.value as UserRole)}
                                  className="p-1 border border-neutral-200 bg-neutral-50 rounded text-[10px] text-neutral-600 font-semibold"
                                >
                                  <option value={UserRole.EMPLOYEE}>Make Employee</option>
                                  <option value={UserRole.ASSET_MANAGER}>Promote: Asset Mgr</option>
                                  <option value={UserRole.DEPARTMENT_HEAD}>Promote: Dept Head</option>
                                </select>
                              )}

                              {emp.id !== user.id && (
                                <button
                                  onClick={() => handleToggleUserStatus(emp.id)}
                                  className={`p-1.5 rounded hover:bg-neutral-100 text-xs ${
                                    emp.isActive ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                                  }`}
                                  title={emp.isActive ? "Deactivate User" : "Activate User"}
                                >
                                  {emp.isActive ? <UserMinus size={14} /> : <UserCheck size={14} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

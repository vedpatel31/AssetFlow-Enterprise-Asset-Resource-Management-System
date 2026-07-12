/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { DB, hashPassword } from "./src/server/db.js";
import { 
  UserRole, AssetStatus, AssetCondition, TransferStatus, 
  MaintenanceStatus, AuditCycleStatus, AuditItemStatus,
  Department, AssetCategory, Asset, Allocation, Transfer,
  Booking, MaintenanceRequest, AuditCycle, AuditItem,
  AppNotification, ActivityLog
} from "./src/types.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Helper to log activities
  function logActivity(userId: string, username: string, action: string, module: string, req: express.Request) {
    const db = DB.get();
    const ipAddress = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string;
    const newLog = {
      id: `alog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      username,
      action,
      ipAddress,
      module,
      createdAt: new Date().toISOString()
    };
    db.activityLogs.unshift(newLog);
    DB.save();
  }

  // Helper to create notifications
  function pushNotification(userId: string, message: string, type: string) {
    const db = DB.get();
    const newNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(newNotification);
    DB.save();
  }

  // --- AUTHENTICATION ENDPOINTS ---

  // User Signup (Supports Admin and Employee roles for sandbox testing and initial setups)
  app.post("/api/auth/signup", (req, res) => {
    try {
      const { email, username, password, name, departmentId, role } = req.body;
      if (!email || !username || !password || !name) {
        return res.status(400).json({ error: "Missing required signup fields" });
      }

      const db = DB.get();
      const lowerEmail = email.toLowerCase().trim();
      const lowerUsername = username.toLowerCase().trim();

      const exists = db.users.find(u => u.email === lowerEmail || u.username === lowerUsername);
      if (exists) {
        return res.status(400).json({ error: "Username or email already exists" });
      }

      // Default to Employee if not specified, otherwise map to selected role
      const assignedRole = Object.values(UserRole).includes(role) ? role : UserRole.EMPLOYEE;

      const newUser = {
        id: `u-${Date.now()}`,
        email: lowerEmail,
        username: lowerUsername,
        name: name.trim(),
        role: assignedRole,
        departmentId: departmentId || undefined,
        passwordHash: hashPassword(password),
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      DB.save();

      logActivity(newUser.id, newUser.username, `Signed up as a new ${assignedRole}.`, "Authentication", req);
      pushNotification(newUser.id, `Welcome to AssetFlow, ${newUser.name}! Your ${assignedRole} account has been created.`, "Signup");

      const { passwordHash, ...userResponse } = newUser;
      return res.status(201).json({ user: userResponse });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // User Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { usernameOrEmail, password, expectedRole } = req.body;
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: "Missing login credentials" });
      }

      const db = DB.get();
      const search = usernameOrEmail.toLowerCase().trim();
      const user = db.users.find(u => u.email === search || u.username === search);

      if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: "Invalid username, email, or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Your account is deactivated. Contact an administrator." });
      }

      // If admin has logged in at least once, portals are unified, so we bypass separate login restrictions.
      // Otherwise, enforce expected login portal role types to ensure correct portal is used.
      if (!db.adminLoggedInAtLeastOnce) {
        if (expectedRole === "Admin" && user.role !== UserRole.ADMIN && user.role !== UserRole.ASSET_MANAGER) {
          return res.status(403).json({ error: "Access Denied: This credentials set belongs to a non-administrative user. Please use the Employee Portal." });
        }
      }

      // Mark admin logged in at least once when they log in
      if (user.role === UserRole.ADMIN) {
        db.adminLoggedInAtLeastOnce = true;
      }

      DB.save();

      logActivity(user.id, user.username, `Logged into the platform (${user.role}).`, "Authentication", req);

      const { passwordHash, ...userResponse } = user;
      return res.json({
        user: userResponse,
        token: `mock-jwt-token-for-${user.id}`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get Auth and Admin Status
  app.get("/api/auth/status", (req, res) => {
    try {
      const db = DB.get();
      const adminExists = db.users.some(u => u.role === UserRole.ADMIN);
      
      // Auto-reconcile for pre-seeded database
      if (adminExists && db.adminLoggedInAtLeastOnce === undefined) {
        db.adminLoggedInAtLeastOnce = true;
        DB.save();
      }

      return res.json({
        adminExists,
        adminLoggedInAtLeastOnce: !!db.adminLoggedInAtLeastOnce
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Database Reset and Control Endpoint (Wipe to blank or seed live data)
  app.post("/api/dev/reset", (req, res) => {
    try {
      const { mode } = req.body;
      const db = DB.get();

      if (mode === "blank") {
        // Wipe everything to represent "not any data available" state
        db.users = [];
        db.departments = [];
        db.assetCategories = [];
        db.assets = [];
        db.allocations = [];
        db.transfers = [];
        db.bookings = [];
        db.maintenanceRequests = [];
        db.auditCycles = [];
        db.auditItems = [];
        db.notifications = [];
        db.adminLoggedInAtLeastOnce = false;
        db.activityLogs = [{
          id: `alog-system-${Date.now()}`,
          userId: "system",
          username: "system",
          action: "Database wiped to completely empty state. Ready for initial setup.",
          ipAddress: "127.0.0.1",
          module: "System",
          createdAt: new Date().toISOString()
        }];
        DB.save();
        return res.json({ message: "Database wiped successfully. You can now register the first administrative user.", empty: true });
      } else {
        // Reset to full sample enterprise state
        DB.reset();
        const freshDb = DB.get();
        freshDb.adminLoggedInAtLeastOnce = true;
        DB.save();
        return res.json({ message: "Database seeded successfully with professional enterprise data." });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Forgot password (simulated)
  app.post("/api/auth/forgot-password", (req, res) => {
    try {
      const { email } = req.body;
      const db = DB.get();
      const user = db.users.find(u => u.email === email.toLowerCase().trim());
      if (!user) {
        return res.status(404).json({ error: "No user found with this email" });
      }

      // Reset to default
      user.passwordHash = hashPassword("password123");
      DB.save();

      logActivity(user.id, user.username, `Requested password reset. Temporary password reset to 'password123'.`, "Authentication", req);
      return res.json({ message: "Password reset instructions sent. For sandbox safety, your temporary password is 'password123'." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Promote User (Admin only)
  app.post("/api/auth/promote", (req, res) => {
    try {
      const { targetUserId, newRole, adminUserId } = req.body;
      const db = DB.get();

      const admin = db.users.find(u => u.id === adminUserId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Unauthorized. Admin role required." });
      }

      const target = db.users.find(u => u.id === targetUserId);
      if (!target) {
        return res.status(404).json({ error: "Target user not found" });
      }

      const oldRole = target.role;
      target.role = newRole as UserRole;
      DB.save();

      logActivity(admin.id, admin.username, `Promoted user ${target.username} from ${oldRole} to ${newRole}.`, "Organization", req);
      pushNotification(target.id, `Your role has been upgraded to ${newRole} by the Administrator.`, "Role Promotion");

      return res.json({ success: true, user: target });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Toggle user status (Active / Inactive)
  app.post("/api/auth/toggle-status", (req, res) => {
    try {
      const { targetUserId, adminUserId } = req.body;
      const db = DB.get();

      const admin = db.users.find(u => u.id === adminUserId);
      if (!admin || admin.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Unauthorized. Admin role required." });
      }

      const target = db.users.find(u => u.id === targetUserId);
      if (!target) {
        return res.status(404).json({ error: "Target user not found" });
      }

      if (target.id === adminUserId) {
        return res.status(400).json({ error: "Cannot toggle your own status as Admin" });
      }

      target.isActive = !target.isActive;
      DB.save();

      logActivity(admin.id, admin.username, `${target.isActive ? "Activated" : "Deactivated"} user account ${target.username}.`, "Organization", req);
      return res.json({ success: true, user: target });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- DEPARTMENTS ENDPOINTS ---
  app.get("/api/departments", (req, res) => {
    return res.json(DB.get().departments);
  });

  app.post("/api/departments", (req, res) => {
    try {
      const { name, parentId, headId, actorUserId } = req.body;
      if (!name) return res.status(400).json({ error: "Department name is required" });

      const db = DB.get();
      const exists = db.departments.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (exists) return res.status(400).json({ error: "Department already exists" });

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Admin only operation." });
      }

      const newDept: Department = {
        id: `d-${Date.now()}`,
        name,
        parentId: parentId || undefined,
        headId: headId || undefined,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.departments.push(newDept);

      // If department head is assigned, update their user role to Department Head
      if (headId) {
        const headUser = db.users.find(u => u.id === headId);
        if (headUser && headUser.role !== UserRole.ADMIN) {
          headUser.role = UserRole.DEPARTMENT_HEAD;
          headUser.departmentId = newDept.id;
        }
      }

      DB.save();
      logActivity(actor.id, actor.username, `Created Department: ${name}`, "Organization", req);
      return res.status(201).json(newDept);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/departments/:id", (req, res) => {
    try {
      const { name, parentId, headId, isActive, actorUserId } = req.body;
      const { id } = req.params;
      const db = DB.get();

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Admin only operation." });
      }

      const dept = db.departments.find(d => d.id === id);
      if (!dept) return res.status(404).json({ error: "Department not found" });

      if (name) dept.name = name;
      dept.parentId = parentId || undefined;
      dept.headId = headId || undefined;
      if (isActive !== undefined) dept.isActive = isActive;

      // Update user roles if head is updated
      if (headId) {
        const headUser = db.users.find(u => u.id === headId);
        if (headUser && headUser.role !== UserRole.ADMIN) {
          headUser.role = UserRole.DEPARTMENT_HEAD;
          headUser.departmentId = id;
        }
      }

      DB.save();
      logActivity(actor.id, actor.username, `Updated Department: ${dept.name}`, "Organization", req);
      return res.json(dept);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- ASSET CATEGORIES ENDPOINTS ---
  app.get("/api/categories", (req, res) => {
    return res.json(DB.get().assetCategories);
  });

  app.post("/api/categories", (req, res) => {
    try {
      const { name, actorUserId } = req.body;
      if (!name) return res.status(400).json({ error: "Category name is required" });

      const db = DB.get();
      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.ASSET_MANAGER)) {
        return res.status(403).json({ error: "Authorized personnel only." });
      }

      const exists = db.assetCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (exists) return res.status(400).json({ error: "Category already exists" });

      const newCategory: AssetCategory = {
        id: `c-${Date.now()}`,
        name,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      db.assetCategories.push(newCategory);
      DB.save();

      logActivity(actor.id, actor.username, `Created Asset Category: ${name}`, "Organization", req);
      return res.status(201).json(newCategory);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/categories/:id", (req, res) => {
    try {
      const { name, isActive, actorUserId } = req.body;
      const { id } = req.params;
      const db = DB.get();

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Admin only operation." });
      }

      const category = db.assetCategories.find(c => c.id === id);
      if (!category) return res.status(404).json({ error: "Category not found" });

      if (name) category.name = name;
      if (isActive !== undefined) category.isActive = isActive;

      DB.save();
      logActivity(actor.id, actor.username, `Updated Asset Category: ${category.name}`, "Organization", req);
      return res.json(category);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- EMPLOYEES ENDPOINTS ---
  app.get("/api/employees", (req, res) => {
    // Return all users as employee list
    const db = DB.get();
    const mapped = db.users.map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });
    return res.json(mapped);
  });


  // --- ASSET WORKFLOWS & CRUD ---
  app.get("/api/assets", (req, res) => {
    return res.json(DB.get().assets);
  });

  // Register Asset (Auto generate AF-0001 tag format)
  app.post("/api/assets", (req, res) => {
    try {
      const { name, categoryId, serialNumber, condition, location, purchaseDate, purchaseCost, isShared, image, warrantyExpiry, documents, actorUserId } = req.body;
      if (!name || !categoryId || !serialNumber || !condition || !location || !purchaseDate || purchaseCost === undefined) {
        return res.status(400).json({ error: "Missing required asset details" });
      }

      const db = DB.get();
      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.ASSET_MANAGER)) {
        return res.status(403).json({ error: "Unauthorized. Asset Manager or Admin role required." });
      }

      const exists = db.assets.find(a => a.serialNumber.toLowerCase() === serialNumber.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: "Asset with this serial number is already registered" });
      }

      // Generate incremental tag like AF-0001, AF-0002...
      const currentCount = db.assets.length;
      const tagNumber = String(currentCount + 1).padStart(4, "0");
      const tag = `AF-${tagNumber}`;

      const newAsset: Asset = {
        id: `a-${Date.now()}`,
        name,
        categoryId,
        tag,
        serialNumber,
        condition: condition as AssetCondition,
        location,
        status: AssetStatus.AVAILABLE,
        purchaseDate,
        purchaseCost: Number(purchaseCost),
        isShared: !!isShared,
        image: image || undefined,
        warrantyExpiry: warrantyExpiry || undefined,
        documents: documents || [],
        createdAt: new Date().toISOString()
      };

      db.assets.push(newAsset);
      DB.save();

      logActivity(actor.id, actor.username, `Registered new asset ${newAsset.name} (${newAsset.tag})`, "Asset", req);
      return res.status(201).json(newAsset);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Edit / Update Asset
  app.put("/api/assets/:id", (req, res) => {
    try {
      const { name, categoryId, serialNumber, condition, location, purchaseDate, purchaseCost, isShared, status, image, warrantyExpiry, documents, actorUserId } = req.body;
      const { id } = req.params;
      const db = DB.get();

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.ASSET_MANAGER)) {
        return res.status(403).json({ error: "Unauthorized." });
      }

      const asset = db.assets.find(a => a.id === id);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      if (name) asset.name = name;
      if (categoryId) asset.categoryId = categoryId;
      if (serialNumber) asset.serialNumber = serialNumber;
      if (condition) asset.condition = condition as AssetCondition;
      if (location) asset.location = location;
      if (purchaseDate) asset.purchaseDate = purchaseDate;
      if (purchaseCost !== undefined) asset.purchaseCost = Number(purchaseCost);
      if (isShared !== undefined) asset.isShared = !!isShared;
      if (status) asset.status = status as AssetStatus;
      if (image !== undefined) asset.image = image;
      if (warrantyExpiry !== undefined) asset.warrantyExpiry = warrantyExpiry;
      if (documents !== undefined) asset.documents = documents;

      DB.save();
      logActivity(actor.id, actor.username, `Updated Asset: ${asset.name} (${asset.tag})`, "Asset", req);
      return res.json(asset);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get Asset Timeline / History
  app.get("/api/assets/:id/timeline", (req, res) => {
    try {
      const { id } = req.params;
      const db = DB.get();

      const asset = db.assets.find(a => a.id === id);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      // Gather allocations, bookings, maintenance requests, and audits for this asset
      const assetAllocations = db.allocations.filter(al => al.assetId === id);
      const assetBookings = db.bookings.filter(b => b.assetId === id);
      const assetMaintenance = db.maintenanceRequests.filter(m => m.assetId === id);
      const assetAuditItems = db.auditItems.filter(ai => ai.assetId === id);

      const timeline: any[] = [];

      assetAllocations.forEach(al => {
        const emp = db.users.find(u => u.id === al.employeeId);
        const by = db.users.find(u => u.id === al.allocatedBy);
        timeline.push({
          type: "Allocation",
          title: `Allocated to ${emp ? emp.name : "Employee"}`,
          description: `Allocated by ${by ? by.name : "Manager"}. Condition Out: ${al.conditionOut}.${al.notes ? ` Notes: ${al.notes}` : ""}`,
          timestamp: al.allocatedDate,
          raw: al
        });
        if (al.actualReturnDate) {
          timeline.push({
            type: "Return",
            title: `Returned to Inventory`,
            description: `Checked-in. Condition In: ${al.conditionIn || "Good"}. Notes: ${al.notes || ""}`,
            timestamp: al.actualReturnDate,
            raw: al
          });
        }
      });

      assetBookings.forEach(b => {
        const usr = db.users.find(u => u.id === b.userId);
        timeline.push({
          type: "Resource Booking",
          title: `Booked: ${b.title}`,
          description: `Booked by ${usr ? usr.name : "Employee"}. Period: ${new Date(b.startTime).toLocaleTimeString()} - ${new Date(b.endTime).toLocaleTimeString()}`,
          timestamp: b.startTime,
          raw: b
        });
      });

      assetMaintenance.forEach(m => {
        const reporter = db.users.find(u => u.id === m.reporterId);
        timeline.push({
          type: "Maintenance Request",
          title: `Maintenance: ${m.status}`,
          description: `Reported by ${reporter ? reporter.name : "Staff"}. Defect: ${m.description}.${m.technician ? ` Assigned to: ${m.technician}` : ""}`,
          timestamp: m.createdAt,
          raw: m
        });
      });

      assetAuditItems.forEach(ai => {
        const cycle = db.auditCycles.find(c => c.id === ai.auditCycleId);
        const auditor = db.users.find(u => u.id === ai.verifiedBy);
        if (ai.status !== AuditItemStatus.PENDING) {
          timeline.push({
            type: "Audit Verification",
            title: `Audited in Cycle: ${cycle ? cycle.name : "Audit"}`,
            description: `Status evaluated as ${ai.status} by ${auditor ? auditor.name : "Auditor"}. Notes: ${ai.notes || ""}`,
            timestamp: ai.verifiedDate || cycle?.createdAt || new Date().toISOString(),
            raw: ai
          });
        }
      });

      // Sort timeline chronologically (latest first)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return res.json({ asset, timeline });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- ALLOCATION WORKFLOWS ---

  // Get All Allocations
  app.get("/api/allocations", (req, res) => {
    try {
      return res.json(DB.get().allocations);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Create Allocation (Prevent double allocation)
  app.post("/api/allocations", (req, res) => {
    try {
      const { assetId, employeeId, allocatedBy, expectedReturnDate, notes } = req.body;
      if (!assetId || !employeeId || !allocatedBy || !expectedReturnDate) {
        return res.status(400).json({ error: "Missing required allocation parameters" });
      }

      const db = DB.get();
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      if (asset.status !== AssetStatus.AVAILABLE) {
        return res.status(400).json({ error: `Asset is currently ${asset.status} and cannot be allocated.` });
      }

      const employee = db.users.find(u => u.id === employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      const allocator = db.users.find(u => u.id === allocatedBy);
      if (!allocator || (allocator.role !== UserRole.ADMIN && allocator.role !== UserRole.ASSET_MANAGER)) {
        return res.status(403).json({ error: "Unauthorized. Allocator must be Admin or Asset Manager." });
      }

      const newAllocation: Allocation = {
        id: `al-${Date.now()}`,
        assetId,
        employeeId,
        allocatedBy,
        allocatedDate: new Date().toISOString(),
        expectedReturnDate,
        conditionOut: asset.condition,
        notes: notes || undefined
      };

      // Transition asset lifecycle
      asset.status = AssetStatus.ALLOCATED;
      db.allocations.push(newAllocation);
      DB.save();

      logActivity(allocator.id, allocator.username, `Allocated ${asset.name} (${asset.tag}) to ${employee.name}`, "Allocation", req);
      pushNotification(employee.id, `Asset ${asset.name} (${asset.tag}) has been allocated to you. Expected return: ${expectedReturnDate}.`, "Asset Assigned");

      return res.status(201).json(newAllocation);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Return Asset Workflow
  app.post("/api/allocations/return", (req, res) => {
    try {
      const { assetId, actualCondition, notes, actorUserId } = req.body;
      if (!assetId || !actualCondition) {
        return res.status(400).json({ error: "Asset ID and return condition are required" });
      }

      const db = DB.get();
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      const allocation = db.allocations.find(al => al.assetId === assetId && !al.actualReturnDate);
      if (!allocation) {
        return res.status(400).json({ error: "No active allocation record found for this asset" });
      }

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.ASSET_MANAGER)) {
        return res.status(403).json({ error: "Only Admin or Asset Managers can process returns" });
      }

      // Update Allocation Record
      allocation.actualReturnDate = new Date().toISOString();
      allocation.conditionIn = actualCondition as AssetCondition;
      allocation.notes = notes ? `${allocation.notes || ""}; Return Check: ${notes}` : allocation.notes;

      // Update Asset status & condition
      asset.status = AssetStatus.AVAILABLE;
      asset.condition = actualCondition as AssetCondition;

      DB.save();

      const borrower = db.users.find(u => u.id === allocation.employeeId);
      logActivity(actor.id, actor.username, `Processed return of asset ${asset.name} (${asset.tag}) from ${borrower ? borrower.name : "Employee"}`, "Allocation", req);
      if (borrower) {
        pushNotification(borrower.id, `Your return of ${asset.name} (${asset.tag}) has been verified and returned to inventory.`, "Asset Returned");
      }

      return res.json({ success: true, allocation });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- TRANSFER REQUEST WORKFLOWS ---
  app.get("/api/transfers", (req, res) => {
    return res.json(DB.get().transfers);
  });

  // Create Transfer Request
  app.post("/api/transfers", (req, res) => {
    try {
      const { assetId, newHolderId, requesterId } = req.body;
      if (!assetId || !newHolderId || !requesterId) {
        return res.status(400).json({ error: "Asset, target holder, and requester are required" });
      }

      const db = DB.get();
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      // Find active allocation
      const currentAllocation = db.allocations.find(al => al.assetId === assetId && !al.actualReturnDate);
      if (!currentAllocation) {
        return res.status(400).json({ error: "Asset is not currently allocated to anyone, can allocate directly" });
      }

      const requester = db.users.find(u => u.id === requesterId);
      if (!requester) return res.status(404).json({ error: "Requester not found" });

      const newHolder = db.users.find(u => u.id === newHolderId);
      if (!newHolder) return res.status(404).json({ error: "New target holder not found" });

      const newTransfer: Transfer = {
        id: `t-${Date.now()}`,
        assetId,
        currentHolderId: currentAllocation.employeeId,
        newHolderId,
        requesterId,
        status: TransferStatus.REQUESTED,
        createdAt: new Date().toISOString()
      };

      db.transfers.push(newTransfer);
      DB.save();

      logActivity(requester.id, requester.username, `Requested asset transfer of ${asset.name} (${asset.tag}) from ${db.users.find(u=>u.id===currentAllocation.employeeId)?.name} to ${newHolder.name}`, "Transfer", req);
      
      // Notify department head if they belong to a department
      const currentHolder = db.users.find(u => u.id === currentAllocation.employeeId);
      if (currentHolder?.departmentId) {
        const dept = db.departments.find(d => d.id === currentHolder.departmentId);
        if (dept?.headId) {
          pushNotification(dept.headId, `Transfer requested: ${asset.name} from ${currentHolder.name} to ${newHolder.name} needs your Department Head Approval.`, "Transfer Request");
        }
      }

      return res.status(201).json(newTransfer);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Approve Transfer Request
  app.post("/api/transfers/:id/approve", (req, res) => {
    try {
      const { id } = req.params;
      const { actorUserId } = req.body;
      const db = DB.get();

      const transfer = db.transfers.find(t => t.id === id);
      if (!transfer) return res.status(404).json({ error: "Transfer request not found" });

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor) return res.status(404).json({ error: "User actor not found" });

      const asset = db.assets.find(a => a.id === transfer.assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      const currentHolder = db.users.find(u => u.id === transfer.currentHolderId);
      const newHolder = db.users.find(u => u.id === transfer.newHolderId);

      // Workflow transition:
      // Requested -> Approved by Dept Head -> Approved by Asset Manager (Transferred)
      if (transfer.status === TransferStatus.REQUESTED) {
        // Must be Department Head (or Admin)
        if (actor.role !== UserRole.DEPARTMENT_HEAD && actor.role !== UserRole.ADMIN) {
          return res.status(403).json({ error: "Only Department Heads or Admins can perform initial transfer approval" });
        }
        transfer.status = TransferStatus.APPROVED_DEPT;
        transfer.deptHeadApprovalDate = new Date().toISOString();
        DB.save();

        logActivity(actor.id, actor.username, `Approved transfer request for ${asset.name} (Department Head approval)`, "Transfer", req);
        
        // Notify Asset Managers for final seal
        const managers = db.users.filter(u => u.role === UserRole.ASSET_MANAGER);
        managers.forEach(m => {
          pushNotification(m.id, `Transfer of ${asset.name} from ${currentHolder?.name} to ${newHolder?.name} has been approved by Dept Head, requires Asset Manager approval.`, "Transfer Request");
        });

      } else if (transfer.status === TransferStatus.APPROVED_DEPT) {
        // Must be Asset Manager (or Admin)
        if (actor.role !== UserRole.ASSET_MANAGER && actor.role !== UserRole.ADMIN) {
          return res.status(403).json({ error: "Only Asset Managers or Admins can perform final transfer approval" });
        }
        transfer.status = TransferStatus.APPROVED_AM;
        transfer.assetMgrApprovalDate = new Date().toISOString();

        // EXECUTE ACTUAL ALLOCATION SWITCH
        const currentAlloc = db.allocations.find(al => al.assetId === transfer.assetId && !al.actualReturnDate);
        if (currentAlloc) {
          currentAlloc.actualReturnDate = new Date().toISOString();
          currentAlloc.conditionIn = asset.condition;
          currentAlloc.notes = `Transferred directly to ${newHolder?.name} in transfer workflow ${transfer.id}`;
        }

        const newAlloc: Allocation = {
          id: `al-${Date.now()}`,
          assetId: transfer.assetId,
          employeeId: transfer.newHolderId,
          allocatedBy: actor.id,
          allocatedDate: new Date().toISOString(),
          expectedReturnDate: new Date(Date.now() + 180*24*60*60*1000).toISOString().split("T")[0], // default 6 months
          conditionOut: asset.condition,
          notes: `Created via approved transfer request ${transfer.id}`
        };

        db.allocations.push(newAlloc);
        DB.save();

        logActivity(actor.id, actor.username, `Finalized transfer of ${asset.name} to ${newHolder?.name}`, "Transfer", req);
        if (newHolder) pushNotification(newHolder.id, `Asset ${asset.name} (${asset.tag}) has been successfully transferred to your custody.`, "Transfer Approved");
        if (currentHolder) pushNotification(currentHolder.id, `Asset ${asset.name} (${asset.tag}) has been transferred out of your custody.`, "Transfer Approved");

      } else {
        return res.status(400).json({ error: "Transfer request is already fully processed" });
      }

      return res.json({ success: true, transfer });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Reject Transfer Request
  app.post("/api/transfers/:id/reject", (req, res) => {
    try {
      const { id } = req.params;
      const { actorUserId, reason } = req.body;
      const db = DB.get();

      const transfer = db.transfers.find(t => t.id === id);
      if (!transfer) return res.status(404).json({ error: "Transfer request not found" });

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role === UserRole.EMPLOYEE) {
        return res.status(403).json({ error: "Employee role cannot reject transfers" });
      }

      transfer.status = TransferStatus.REJECTED;
      transfer.rejectedReason = reason || "Declined by management";
      DB.save();

      const asset = db.assets.find(a => a.id === transfer.assetId);
      logActivity(actor.id, actor.username, `Rejected transfer request of asset ${asset ? asset.name : "Asset"}: ${reason}`, "Transfer", req);
      
      const requester = db.users.find(u => u.id === transfer.requesterId);
      if (requester) {
        pushNotification(requester.id, `Your transfer request for ${asset ? asset.name : "asset"} was rejected. Reason: ${reason || "None specified"}.`, "Transfer Rejected");
      }

      return res.json({ success: true, transfer });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- RESOURCE BOOKINGS ENDPOINTS ---
  app.get("/api/bookings", (req, res) => {
    return res.json(DB.get().bookings);
  });

  // Create Resource Booking with strict overlap verification
  app.post("/api/bookings", (req, res) => {
    try {
      const { assetId, userId, title, startTime, endTime } = req.body;
      if (!assetId || !userId || !title || !startTime || !endTime) {
        return res.status(400).json({ error: "Missing required booking details" });
      }

      const db = DB.get();
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      if (!asset.isShared) {
        return res.status(400).json({ error: "This asset is not a shared resource and cannot be booked." });
      }

      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();

      if (start >= end) {
        return res.status(400).json({ error: "Start time must be strictly before end time." });
      }

      // Overlap Verification:
      // Conflicting bookings are active bookings on the same asset that overlap in time
      const conflicts = db.bookings.filter(b => {
        if (b.assetId !== assetId || b.status === "Cancelled") return false;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        // Overlaps if: (start < bEnd) && (end > bStart)
        return start < bEnd && end > bStart;
      });

      if (conflicts.length > 0) {
        return res.status(400).json({ error: "Time slot overlaps with an existing booking. Please select a different time." });
      }

      const user = db.users.find(u => u.id === userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const newBooking: Booking = {
        id: `b-${Date.now()}`,
        assetId,
        userId,
        title,
        startTime,
        endTime,
        status: "Confirmed",
        createdAt: new Date().toISOString()
      };

      db.bookings.push(newBooking);
      DB.save();

      logActivity(user.id, user.username, `Booked shared resource ${asset.name} for '${title}'`, "Booking", req);
      pushNotification(user.id, `Booking confirmed: ${asset.name} on ${new Date(startTime).toLocaleDateString()} from ${new Date(startTime).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})} to ${new Date(endTime).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}.`, "Booking Confirmed");

      return res.status(201).json(newBooking);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Cancel Booking
  app.delete("/api/bookings/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { actorUserId } = req.body;
      const db = DB.get();

      const booking = db.bookings.find(b => b.id === id);
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor) return res.status(404).json({ error: "Actor not found" });

      if (booking.userId !== actorUserId && actor.role === UserRole.EMPLOYEE) {
        return res.status(403).json({ error: "You cannot cancel bookings belonging to other employees" });
      }

      booking.status = "Cancelled";
      DB.save();

      const asset = db.assets.find(a => a.id === booking.assetId);
      logActivity(actor.id, actor.username, `Cancelled booking for ${asset ? asset.name : "Asset"}`, "Booking", req);
      pushNotification(booking.userId, `Your booking for ${asset ? asset.name : "shared resource"} was cancelled.`, "Booking Cancelled");

      return res.json({ success: true, booking });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- MAINTENANCE REQUESTS ENDPOINTS ---
  app.get("/api/maintenance", (req, res) => {
    return res.json(DB.get().maintenanceRequests);
  });

  // Raise Maintenance Request (Workflow: Pending)
  app.post("/api/maintenance", (req, res) => {
    try {
      const { assetId, reporterId, description } = req.body;
      if (!assetId || !reporterId || !description) {
        return res.status(400).json({ error: "Missing required maintenance detail" });
      }

      const db = DB.get();
      const asset = db.assets.find(a => a.id === assetId);
      if (!asset) return res.status(404).json({ error: "Asset not found" });

      const reporter = db.users.find(u => u.id === reporterId);
      if (!reporter) return res.status(404).json({ error: "Reporter user not found" });

      const newRequest: MaintenanceRequest = {
        id: `m-${Date.now()}`,
        assetId,
        reporterId,
        description,
        status: MaintenanceStatus.PENDING,
        createdAt: new Date().toISOString()
      };

      // Set asset status to Under Maintenance to lock allocation
      asset.status = AssetStatus.UNDER_MAINTENANCE;

      db.maintenanceRequests.push(newRequest);
      DB.save();

      logActivity(reporter.id, reporter.username, `Raised maintenance ticket for ${asset.name} (${asset.tag})`, "Maintenance", req);
      
      // Notify Asset Managers
      const managers = db.users.filter(u => u.role === UserRole.ASSET_MANAGER);
      managers.forEach(m => {
        pushNotification(m.id, `New maintenance request raised for ${asset.name} (${asset.tag}) by ${reporter.name}.`, "Maintenance Alert");
      });

      return res.status(201).json(newRequest);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Update Maintenance Workflow State
  app.put("/api/maintenance/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status, technician, notes, actorUserId } = req.body;
      const db = DB.get();

      const reqst = db.maintenanceRequests.find(m => m.id === id);
      if (!reqst) return res.status(404).json({ error: "Maintenance request not found" });

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.ASSET_MANAGER)) {
        return res.status(403).json({ error: "Unauthorized. Asset Managers/Admins only." });
      }

      const asset = db.assets.find(a => a.id === reqst.assetId);

      reqst.status = status as MaintenanceStatus;
      if (technician) {
        reqst.technician = technician;
        reqst.assignedDate = new Date().toISOString();
      }
      if (notes) {
        reqst.notes = notes;
      }

      // If resolved, return asset to Available status
      if (status === MaintenanceStatus.RESOLVED) {
        reqst.resolvedDate = new Date().toISOString();
        if (asset) {
          asset.status = AssetStatus.AVAILABLE;
          asset.condition = AssetCondition.EXCELLENT; // Repaired to working condition
        }
      } else if (status === MaintenanceStatus.REJECTED) {
        if (asset) {
          // Put back to available if was pending
          asset.status = AssetStatus.AVAILABLE;
        }
      }

      DB.save();
      logActivity(actor.id, actor.username, `Updated maintenance ticket status to ${status} for ${asset ? asset.name : "Asset"}`, "Maintenance", req);
      
      const reporter = db.users.find(u => u.id === reqst.reporterId);
      if (reporter) {
        pushNotification(reporter.id, `Maintenance request for ${asset ? asset.name : "asset"} has been updated to ${status}.`, "Maintenance Approved");
      }

      return res.json({ success: true, request: reqst });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- AUDIT WORKFLOW MODULE ---
  app.get("/api/audits", (req, res) => {
    return res.json(DB.get().auditCycles);
  });

  app.get("/api/audits/:id/items", (req, res) => {
    const { id } = req.params;
    const db = DB.get();
    return res.json(db.auditItems.filter(item => item.auditCycleId === id));
  });

  // Create Audit Cycle & seed AuditItems automatically for all assets
  app.post("/api/audits", (req, res) => {
    try {
      const { name, startDate, endDate, actorUserId } = req.body;
      if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: "Missing required audit parameters" });
      }

      const db = DB.get();
      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Admin only operation." });
      }

      const newCycle: AuditCycle = {
        id: `au-${Date.now()}`,
        name,
        createdBy: actorUserId,
        status: AuditCycleStatus.ACTIVE,
        startDate,
        endDate,
        createdAt: new Date().toISOString()
      };

      db.auditCycles.push(newCycle);

      // Create an AuditItem for every registered, active asset
      db.assets.forEach(asset => {
        db.auditItems.push({
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          auditCycleId: newCycle.id,
          assetId: asset.id,
          status: AuditItemStatus.PENDING
        });
      });

      DB.save();
      logActivity(actor.id, actor.username, `Launched new Audit Cycle: ${name}`, "Audit", req);

      // Notify all managers & department heads
      db.users.filter(u => u.role !== UserRole.EMPLOYEE).forEach(u => {
        pushNotification(u.id, `A company-wide audit cycle '${name}' has started. Please verify assets in your custody.`, "Audit Started");
      });

      return res.status(201).json(newCycle);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Audit Item Verification (Submit Auditor Check)
  app.post("/api/audits/:cycleId/verify", (req, res) => {
    try {
      const { cycleId } = req.params;
      const { assetId, status, notes, actorUserId } = req.body;
      const db = DB.get();

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role === UserRole.EMPLOYEE) {
        return res.status(403).json({ error: "Employees cannot conduct audits" });
      }

      const auditItem = db.auditItems.find(item => item.auditCycleId === cycleId && item.assetId === assetId);
      if (!auditItem) return res.status(404).json({ error: "Audit item not found" });

      auditItem.status = status as AuditItemStatus;
      auditItem.verifiedBy = actorUserId;
      auditItem.verifiedDate = new Date().toISOString();
      auditItem.notes = notes || undefined;

      // Realtime condition update if auditor noticed damage or missing status
      const asset = db.assets.find(a => a.id === assetId);
      if (asset) {
        if (status === AuditItemStatus.DAMAGED) {
          asset.condition = AssetCondition.DAMAGED;
        }
      }

      DB.save();
      logActivity(actor.id, actor.username, `Audited asset ${asset ? asset.name : "Asset"}: status set to ${status}`, "Audit", req);
      return res.json({ success: true, item: auditItem });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Close Audit & Lock Cycle (Generate Discrepancy Report)
  app.post("/api/audits/:id/close", (req, res) => {
    try {
      const { id } = req.params;
      const { actorUserId } = req.body;
      const db = DB.get();

      const actor = db.users.find(u => u.id === actorUserId);
      if (!actor || actor.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Only Admin can lock/close audit cycles" });
      }

      const cycle = db.auditCycles.find(c => c.id === id);
      if (!cycle) return res.status(404).json({ error: "Audit cycle not found" });

      const items = db.auditItems.filter(item => item.auditCycleId === id);

      // Generate report metrics
      const totalAudited = items.length;
      const verifiedCount = items.filter(i => i.status === AuditItemStatus.VERIFIED).length;
      const missingCount = items.filter(i => i.status === AuditItemStatus.MISSING).length;
      const damagedCount = items.filter(i => i.status === AuditItemStatus.DAMAGED).length;

      cycle.status = AuditCycleStatus.COMPLETED;
      cycle.completedDate = new Date().toISOString();
      cycle.discrepancyReport = {
        totalAudited,
        verifiedCount,
        missingCount,
        damagedCount
      };

      // Discrepancy: Missing assets automatically become "Lost" in the system
      items.forEach(item => {
        if (item.status === AuditItemStatus.MISSING) {
          const asset = db.assets.find(a => a.id === item.assetId);
          if (asset) asset.status = AssetStatus.LOST;
        } else if (item.status === AuditItemStatus.DAMAGED) {
          const asset = db.assets.find(a => a.id === item.assetId);
          if (asset) {
            asset.condition = AssetCondition.DAMAGED;
            // Optionally set Under Maintenance or retain Allocated with Damage
          }
        }
      });

      DB.save();
      logActivity(actor.id, actor.username, `Closed Audit Cycle and locked results: ${cycle.name}`, "Audit", req);

      db.users.forEach(u => {
        pushNotification(u.id, `Audit cycle '${cycle.name}' has been closed. Final discrepancy reports generated.`, "Audit Completed");
      });

      return res.json({ success: true, cycle });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- REPORTS ENDPOINTS ---
  app.get("/api/reports/summary", (req, res) => {
    try {
      const db = DB.get();

      // Basic Asset KPIs
      const totalAssets = db.assets.length;
      const availableAssets = db.assets.filter(a => a.status === AssetStatus.AVAILABLE).length;
      const allocatedAssets = db.assets.filter(a => a.status === AssetStatus.ALLOCATED).length;
      const lostAssets = db.assets.filter(a => a.status === AssetStatus.LOST).length;
      const maintenanceCount = db.assets.filter(a => a.status === AssetStatus.UNDER_MAINTENANCE).length;

      // Pending Workflows count
      const pendingApprovals = db.transfers.filter(t => t.status === TransferStatus.REQUESTED || t.status === TransferStatus.APPROVED_DEPT).length;
      const activeBookingsCount = db.bookings.filter(b => b.status === "Confirmed").length;
      
      // Asset categories distribution
      const categoryDistribution = db.assetCategories.map(cat => {
        return {
          categoryName: cat.name,
          count: db.assets.filter(a => a.categoryId === cat.id).length
        };
      });

      // Department assets summary
      const departmentAssets = db.departments.map(dept => {
        // Users belonging to this department
        const userIds = db.users.filter(u => u.departmentId === dept.id).map(u => u.id);
        // Active allocations of these users
        const activeAllocations = db.allocations.filter(al => userIds.includes(al.employeeId) && !al.actualReturnDate);
        return {
          departmentName: dept.name,
          employeeCount: userIds.length,
          allocatedAssetCount: activeAllocations.length,
          costValuation: activeAllocations.reduce((acc, current) => {
            const asset = db.assets.find(a => a.id === current.assetId);
            return acc + (asset ? Number(asset.purchaseCost) : 0);
          }, 0)
        };
      });

      // Resource booking statistics
      const bookingStatistics = db.assets.filter(a => a.isShared).map(asset => {
        const bookingsCount = db.bookings.filter(b => b.assetId === asset.id && b.status === "Confirmed").length;
        return {
          assetName: asset.name,
          assetTag: asset.tag,
          bookingsCount
        };
      });

      // Maintenance reports frequency
      const maintenanceFrequency = db.assets.map(asset => {
        const requests = db.maintenanceRequests.filter(m => m.assetId === asset.id);
        return {
          assetName: asset.name,
          assetTag: asset.tag,
          totalTickets: requests.length,
          resolvedTickets: requests.filter(r => r.status === MaintenanceStatus.RESOLVED).length
        };
      }).filter(item => item.totalTickets > 0);

      return res.json({
        kpis: {
          totalAssets,
          availableAssets,
          allocatedAssets,
          lostAssets,
          maintenanceCount,
          pendingApprovals,
          activeBookingsCount
        },
        categoryDistribution,
        departmentAssets,
        bookingStatistics,
        maintenanceFrequency
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // --- NOTIFICATIONS ENDPOINTS ---
  app.get("/api/notifications", (req, res) => {
    const { userId } = req.query;
    const db = DB.get();
    if (userId) {
      return res.json(db.notifications.filter(n => n.userId === userId));
    }
    return res.json(db.notifications);
  });

  app.post("/api/notifications/read-all", (req, res) => {
    const { userId } = req.body;
    const db = DB.get();
    let count = 0;
    db.notifications.forEach(n => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    });
    if (count > 0) DB.save();
    return res.json({ success: true, markedRead: count });
  });


  // --- ACTIVITY LOGS ---
  app.get("/api/activity-logs", (req, res) => {
    return res.json(DB.get().activityLogs);
  });


  // --- INTEGRATION WITH VITE FRONTEND MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AssetFlow ERP Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server bootstrap error:", err);
});

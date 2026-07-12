/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Admin",
  ASSET_MANAGER = "Asset Manager",
  DEPARTMENT_HEAD = "Department Head",
  EMPLOYEE = "Employee"
}

export enum AssetStatus {
  AVAILABLE = "Available",
  ALLOCATED = "Allocated",
  RESERVED = "Reserved",
  UNDER_MAINTENANCE = "Under Maintenance",
  LOST = "Lost",
  RETIRED = "Retired",
  DISPOSED = "Disposed"
}

export enum AssetCondition {
  EXCELLENT = "Excellent",
  GOOD = "Good",
  DAMAGED = "Damaged"
}

export enum TransferStatus {
  REQUESTED = "Requested",
  APPROVED_DEPT = "Approved by Dept Head",
  APPROVED_AM = "Approved by Asset Manager",
  REJECTED = "Rejected"
}

export enum MaintenanceStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  ASSIGNED = "Technician Assigned",
  IN_PROGRESS = "In Progress",
  RESOLVED = "Resolved"
}

export enum AuditCycleStatus {
  DRAFT = "Draft",
  ACTIVE = "Active",
  COMPLETED = "Completed"
}

export enum AuditItemStatus {
  PENDING = "Pending",
  VERIFIED = "Verified",
  MISSING = "Missing",
  DAMAGED = "Damaged"
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  headId?: string; // Employee ID (or User ID) who is Dept Head
  isActive: boolean;
  createdAt: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  categoryId: string;
  tag: string; // AF-0001
  serialNumber: string;
  condition: AssetCondition;
  location: string;
  status: AssetStatus;
  purchaseDate: string;
  purchaseCost: number;
  isShared: boolean;
  image?: string;
  warrantyExpiry?: string;
  documents?: string[]; // list of names/URLs
  createdAt: string;
}

export interface Allocation {
  id: string;
  assetId: string;
  employeeId: string; // User ID of employee
  allocatedBy: string; // User ID of allocator
  allocatedDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  conditionOut: AssetCondition;
  conditionIn?: AssetCondition;
  notes?: string;
}

export interface Transfer {
  id: string;
  assetId: string;
  currentHolderId: string; // User ID
  newHolderId: string; // User ID
  requesterId: string; // User ID
  status: TransferStatus;
  deptHeadApprovalDate?: string;
  assetMgrApprovalDate?: string;
  rejectedReason?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  assetId: string;
  userId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: "Confirmed" | "Cancelled";
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  reporterId: string; // User ID
  description: string;
  status: MaintenanceStatus;
  technician?: string;
  assignedDate?: string;
  resolvedDate?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditCycle {
  id: string;
  name: string;
  createdBy: string; // User ID
  status: AuditCycleStatus;
  startDate: string;
  endDate: string;
  completedDate?: string;
  discrepancyReport?: {
    totalAudited: number;
    verifiedCount: number;
    missingCount: number;
    damagedCount: number;
  };
  createdAt: string;
}

export interface AuditItem {
  id: string;
  auditCycleId: string;
  assetId: string;
  status: AuditItemStatus;
  verifiedBy?: string; // User ID of auditor
  verifiedDate?: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  userId: string; // User ID
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  ipAddress: string;
  module: string;
  createdAt: string;
}

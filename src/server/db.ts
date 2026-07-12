/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { 
  User, UserRole, Department, AssetCategory, Asset, 
  Allocation, Transfer, Booking, MaintenanceRequest, 
  AuditCycle, AuditItem, AppNotification, ActivityLog,
  AssetStatus, AssetCondition, TransferStatus, MaintenanceStatus,
  AuditCycleStatus, AuditItemStatus
} from "../types.js";

// Database File Path
const DB_FILE = path.join(process.cwd(), "data", "db.json");

// Helper to ensure database directory exists
function ensureDbDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// In-Memory Database Schema interface
export interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  departments: Department[];
  assetCategories: AssetCategory[];
  assets: Asset[];
  allocations: Allocation[];
  transfers: Transfer[];
  bookings: Booking[];
  maintenanceRequests: MaintenanceRequest[];
  auditCycles: AuditCycle[];
  auditItems: AuditItem[];
  notifications: AppNotification[];
  activityLogs: ActivityLog[];
  adminLoggedInAtLeastOnce?: boolean;
}

// Simple deterministic hash to secure passwords
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${hash}`;
}

// Seed Initial Data
export const INITIAL_DB_STATE: DatabaseSchema = {
  users: [
    {
      id: "u-admin",
      email: "admin@assetflow.com",
      username: "admin",
      name: "Admin User",
      role: UserRole.ADMIN,
      passwordHash: hashPassword("admin123"),
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
    },
    {
      id: "u-john",
      email: "john@assetflow.com",
      username: "john",
      name: "John Doe",
      role: UserRole.EMPLOYEE,
      departmentId: "d-it",
      passwordHash: hashPassword("password123"),
      isActive: true,
      createdAt: new Date("2026-02-15T09:00:00.000Z").toISOString()
    },
    {
      id: "u-priya",
      email: "priya@assetflow.com",
      username: "priya",
      name: "Priya Sharma",
      role: UserRole.DEPARTMENT_HEAD,
      departmentId: "d-hr",
      passwordHash: hashPassword("password123"),
      isActive: true,
      createdAt: new Date("2026-02-15T10:00:00.000Z").toISOString()
    },
    {
      id: "u-raj",
      email: "raj@assetflow.com",
      username: "raj",
      name: "Raj Patel",
      role: UserRole.ASSET_MANAGER,
      departmentId: "d-it",
      passwordHash: hashPassword("password123"),
      isActive: true,
      createdAt: new Date("2026-02-15T10:30:00.000Z").toISOString()
    },
    {
      id: "u-aman",
      email: "aman@assetflow.com",
      username: "aman",
      name: "Aman Gupta",
      role: UserRole.EMPLOYEE,
      departmentId: "d-finance",
      passwordHash: hashPassword("password123"),
      isActive: true,
      createdAt: new Date("2026-02-16T11:00:00.000Z").toISOString()
    },
    {
      id: "u-sara",
      email: "sara@assetflow.com",
      username: "sara",
      name: "Sara Jenkins",
      role: UserRole.EMPLOYEE,
      departmentId: "d-marketing",
      passwordHash: hashPassword("password123"),
      isActive: true,
      createdAt: new Date("2026-02-17T14:00:00.000Z").toISOString()
    }
  ],
  departments: [
    {
      id: "d-it",
      name: "IT",
      headId: "u-raj",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "d-hr",
      name: "HR",
      headId: "u-priya",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "d-finance",
      name: "Finance",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "d-marketing",
      name: "Marketing",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "d-operations",
      name: "Operations",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    }
  ],
  assetCategories: [
    {
      id: "c-laptop",
      name: "Laptop",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "c-desktop",
      name: "Desktop",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "c-vehicle",
      name: "Vehicle",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "c-projector",
      name: "Projector",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "c-printer",
      name: "Printer",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "c-furniture",
      name: "Furniture",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    },
    {
      id: "c-meeting-room",
      name: "Meeting Room",
      isActive: true,
      createdAt: new Date("2026-01-10T00:00:00.000Z").toISOString()
    }
  ],
  assets: [
    {
      id: "a-0001",
      name: "Dell Latitude 7440",
      categoryId: "c-laptop",
      tag: "AF-0001",
      serialNumber: "DLX23423423",
      condition: AssetCondition.EXCELLENT,
      location: "IT Floor 2",
      status: AssetStatus.AVAILABLE,
      purchaseDate: "2026-01-15",
      purchaseCost: 1200,
      isShared: false,
      warrantyExpiry: "2028-01-15",
      createdAt: new Date("2026-01-15T11:00:00.000Z").toISOString()
    },
    {
      id: "a-0002",
      name: "MacBook Pro 16\"",
      categoryId: "c-laptop",
      tag: "AF-0002",
      serialNumber: "C02F239XMD6M",
      condition: AssetCondition.EXCELLENT,
      location: "HQ Floor 3",
      status: AssetStatus.ALLOCATED,
      purchaseDate: "2026-02-01",
      purchaseCost: 2400,
      isShared: false,
      warrantyExpiry: "2029-02-01",
      createdAt: new Date("2026-02-01T12:00:00.000Z").toISOString()
    },
    {
      id: "a-0003",
      name: "Conference Room Alpha",
      categoryId: "c-meeting-room",
      tag: "AF-0003",
      serialNumber: "ROOM-ALPHA",
      condition: AssetCondition.EXCELLENT,
      location: "Operations Block 1",
      status: AssetStatus.AVAILABLE,
      purchaseDate: "2025-12-01",
      purchaseCost: 5000,
      isShared: true,
      createdAt: new Date("2025-12-01T10:00:00.000Z").toISOString()
    },
    {
      id: "a-0004",
      name: "Toyota Camry",
      categoryId: "c-vehicle",
      tag: "AF-0004",
      serialNumber: "TOY293847293",
      condition: AssetCondition.GOOD,
      location: "Basement Parking B1",
      status: AssetStatus.AVAILABLE,
      purchaseDate: "2025-05-10",
      purchaseCost: 28000,
      isShared: true,
      warrantyExpiry: "2030-05-10",
      createdAt: new Date("2025-05-10T15:00:00.000Z").toISOString()
    },
    {
      id: "a-0005",
      name: "Epson Projector Pro",
      categoryId: "c-projector",
      tag: "AF-0005",
      serialNumber: "EPS8492839",
      condition: AssetCondition.DAMAGED,
      location: "Conference Room Beta",
      status: AssetStatus.UNDER_MAINTENANCE,
      purchaseDate: "2026-03-10",
      purchaseCost: 800,
      isShared: true,
      createdAt: new Date("2026-03-10T09:00:00.000Z").toISOString()
    }
  ],
  allocations: [
    {
      id: "al-0001",
      assetId: "a-0002",
      employeeId: "u-john",
      allocatedBy: "u-raj",
      allocatedDate: "2026-02-18T09:00:00.000Z",
      expectedReturnDate: "2026-08-18",
      conditionOut: AssetCondition.EXCELLENT
    }
  ],
  transfers: [],
  bookings: [
    {
      id: "b-0001",
      assetId: "a-0003",
      userId: "u-priya",
      title: "Quarterly HR Review",
      startTime: "2026-07-12T09:00:00.000Z",
      endTime: "2026-07-12T10:00:00.000Z",
      status: "Confirmed",
      createdAt: new Date("2026-07-11T12:00:00.000Z").toISOString()
    }
  ],
  maintenanceRequests: [
    {
      id: "m-0001",
      assetId: "a-0005",
      reporterId: "u-john",
      description: "Lamp brightness is very dim and blinks repeatedly.",
      status: MaintenanceStatus.ASSIGNED,
      technician: "Alex Miller (IT Hardware Support)",
      assignedDate: "2026-07-11T10:00:00.000Z",
      createdAt: new Date("2026-07-10T14:30:00.000Z").toISOString()
    }
  ],
  auditCycles: [
    {
      id: "au-0001",
      name: "Mid-Year Asset Audit 2026",
      createdBy: "u-admin",
      status: AuditCycleStatus.ACTIVE,
      startDate: "2026-07-01",
      endDate: "2026-07-20",
      createdAt: new Date("2026-07-01T09:00:00.000Z").toISOString()
    }
  ],
  auditItems: [
    {
      id: "ai-0001",
      auditCycleId: "au-0001",
      assetId: "a-0001",
      status: AuditItemStatus.PENDING
    },
    {
      id: "ai-0002",
      auditCycleId: "au-0001",
      assetId: "a-0002",
      status: AuditItemStatus.VERIFIED,
      verifiedBy: "u-raj",
      verifiedDate: "2026-07-05T14:00:00.000Z",
      notes: "Macbook confirmed in Priya's custody, good shape."
    },
    {
      id: "ai-0003",
      auditCycleId: "au-0001",
      assetId: "a-0003",
      status: AuditItemStatus.VERIFIED,
      verifiedBy: "u-priya",
      verifiedDate: "2026-07-06T11:00:00.000Z",
      notes: "Room is clean and all AV equipment works."
    },
    {
      id: "ai-0004",
      auditCycleId: "au-0001",
      assetId: "a-0004",
      status: AuditItemStatus.PENDING
    },
    {
      id: "ai-0005",
      auditCycleId: "au-0001",
      assetId: "a-0005",
      status: AuditItemStatus.DAMAGED,
      verifiedBy: "u-raj",
      verifiedDate: "2026-07-07T16:00:00.000Z",
      notes: "Projector lamp needs immediate replacement."
    }
  ],
  notifications: [
    {
      id: "n-0001",
      userId: "u-john",
      message: "Laptop MacBook Pro 16\" has been successfully allocated to you.",
      type: "Asset Assigned",
      isRead: false,
      createdAt: new Date("2026-02-18T09:05:00.000Z").toISOString()
    },
    {
      id: "n-0002",
      userId: "u-priya",
      message: "Resource Booking Confirmed: Conference Room Alpha for 2026-07-12 09:00 AM.",
      type: "Booking Confirmed",
      isRead: false,
      createdAt: new Date("2026-07-11T12:00:00.000Z").toISOString()
    }
  ],
  activityLogs: [
    {
      id: "alog-0001",
      userId: "u-admin",
      username: "admin",
      action: "System initialized and default categories/departments seeded.",
      ipAddress: "127.0.0.1",
      module: "Organization",
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
    },
    {
      id: "alog-0002",
      userId: "u-raj",
      username: "raj",
      action: "Allocated MacBook Pro 16\" (AF-0002) to John Doe.",
      ipAddress: "192.168.1.15",
      module: "Allocation",
      createdAt: new Date("2026-02-18T09:00:00.000Z").toISOString()
    }
  ]
};

// Database class helper
export class DB {
  private static instance: DatabaseSchema | null = null;

  public static get(): DatabaseSchema {
    if (this.instance) {
      return this.instance;
    }

    ensureDbDir();

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.instance = JSON.parse(fileContent);
        // Sync any missing tables (migration resilience)
        let modified = false;
        const schema = this.instance as any;
        for (const key of Object.keys(INITIAL_DB_STATE)) {
          if (!schema[key]) {
            schema[key] = (INITIAL_DB_STATE as any)[key];
            modified = true;
          }
        }
        if (modified) {
          this.save();
        }
      } catch (err) {
        console.error("Failed to parse local db file, seeding instead:", err);
        this.instance = JSON.parse(JSON.stringify(INITIAL_DB_STATE));
        this.save();
      }
    } else {
      this.instance = JSON.parse(JSON.stringify(INITIAL_DB_STATE));
      this.save();
    }

    return this.instance!;
  }

  public static save() {
    if (!this.instance) return;
    ensureDbDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(this.instance, null, 2), "utf-8");
  }

  // Transaction support / reset to seed
  public static reset() {
    this.instance = JSON.parse(JSON.stringify(INITIAL_DB_STATE));
    this.save();
    return this.instance!;
  }
}

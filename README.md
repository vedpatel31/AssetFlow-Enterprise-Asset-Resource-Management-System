AssetFlow is a full-stack Enterprise Asset & Resource Management System designed to help organizations efficiently manage their physical assets and shared resources throughout their lifecycle.

Instead of relying on spreadsheets, paper logs, or disconnected systems, AssetFlow provides a centralized platform for tracking assets, allocating resources, scheduling maintenance, managing audits, booking shared facilities, and monitoring organizational operations in real time.

The application is designed with scalability, security, and clean architecture in mind, making it suitable for organizations of any size including:

Corporate Offices
Educational Institutions
Hospitals
Government Agencies
Manufacturing Companies
Startups
NGOs
Warehouses
Research Centers
🎯 Project Goals

AssetFlow aims to:

Digitize physical asset management
Prevent duplicate asset allocation
Simplify shared resource booking
Automate maintenance approval workflows
Track complete asset lifecycle
Improve operational visibility
Reduce manual errors
Generate meaningful reports and analytics
Maintain detailed audit trails
Implement enterprise-grade role-based access control
✨ Features
🔐 Authentication
Secure Login
Employee Signup
JWT Authentication
Refresh Token Support
Forgot Password
Password Reset
Protected Routes
Session Management
👥 Role-Based Access Control

Four user roles are supported:

Admin
Manage Departments
Manage Asset Categories
Manage Employee Directory
Promote Employees
View Organization Analytics
Manage Audit Cycles
Asset Manager
Register Assets
Allocate Assets
Approve Transfers
Approve Maintenance Requests
Manage Returns
Resolve Audit Discrepancies
Department Head
View Department Assets
Approve Department Requests
Book Shared Resources
Monitor Department Utilization
Employee
View Assigned Assets
Book Shared Resources
Raise Maintenance Requests
Request Asset Transfers
Request Asset Returns
🏢 Organization Management
Departments
Create Department
Update Department
Deactivate Department
Parent Department Hierarchy
Department Head Assignment
Asset Categories
Electronics
Furniture
Vehicles
Meeting Rooms
Projectors
Printers
Custom Categories
Employee Directory
Employee Management
Department Assignment
Role Assignment
Active / Inactive Status
💻 Asset Management
Asset Registration

Each asset includes:

Auto Generated Asset Tag
QR Code
Serial Number
Category
Department
Acquisition Date
Acquisition Cost
Warranty
Current Condition
Current Location
Asset Images
Supporting Documents
Shared Resource Flag
Asset Lifecycle

Assets move through multiple states.

Available
     │
     ▼
Allocated
     │
     ▼
Returned
     │
     ▼
Available

Other lifecycle transitions:

Available
     ▼
Under Maintenance
     ▼
Available
Allocated
     ▼
Lost
Retired
Disposed
🔄 Asset Allocation

Supports:

Asset Assignment
Expected Return Date
Asset Returns
Condition Verification
Allocation History
Transfer Requests

Business Rules

No duplicate allocation
One asset can belong to only one employee at a time
Automatic history tracking
Overdue return detection
🔁 Asset Transfer Workflow
Employee Request
        │
        ▼
Department Head Approval
        │
        ▼
Asset Manager Approval
        │
        ▼
Transfer Completed
        │
        ▼
History Updated
📅 Resource Booking

Book shared resources including:

Meeting Rooms
Conference Halls
Vehicles
Projectors
Cameras
Equipment

Features

Calendar View
Time Slot Validation
No Booking Overlaps
Booking Reminder
Reschedule Booking
Cancel Booking

Booking Status

Upcoming
Ongoing
Completed
Cancelled
🛠 Maintenance Management

Employees can raise maintenance requests.

Workflow

Pending
   │
   ▼
Approved
   │
   ▼
Technician Assigned
   │
   ▼
In Progress
   │
   ▼
Resolved

When approved:

Asset automatically becomes Under Maintenance

When resolved:

Asset automatically becomes Available
📋 Asset Audits

Periodic verification of assets.

Supports:

Audit Cycle Creation
Department Scope
Location Scope
Auditor Assignment
Verification
Missing Assets
Damaged Assets
Audit History

Verification Status

Verified
Missing
Damaged

Automatic discrepancy reports are generated after every audit cycle.

📊 Reports & Analytics

Generate reports for:

Asset Utilization
Department Allocation Summary
Asset Availability
Maintenance Frequency
Idle Assets
Resource Booking Heatmaps
Upcoming Maintenance
Retirement Forecast
Audit Reports

Export formats:

PDF
Excel
🔔 Notifications

Real-time notifications include:

Asset Assigned
Asset Returned
Booking Confirmed
Booking Reminder
Maintenance Approved
Maintenance Rejected
Transfer Approved
Audit Started
Audit Completed
Overdue Returns
📜 Activity Logs

Every important action is recorded.

Each log contains:

User
Action
Module
Timestamp
IP Address
Previous Value
Updated Value
🗂 Database Modules
Users
Employees
Departments
Asset Categories
Assets
Asset Allocations
Transfers
Resource Bookings
Maintenance Requests
Audit Cycles
Audit Items
Notifications
Activity Logs
Documents
🛡 Business Rules

✔ Employee signup cannot assign Admin privileges.

✔ Only Admin can promote users to higher roles.

✔ Assets cannot be allocated twice.

✔ Booking overlaps are prevented.

✔ Asset history is immutable.

✔ Maintenance requires approval before work begins.

✔ Audit cycles are locked after completion.

✔ Asset status updates automatically throughout workflows.

✔ Every action is logged.

🏗 Tech Stack
Frontend
Next.js 15
TypeScript
React
Tailwind CSS
shadcn/ui
Framer Motion
Zustand
TanStack Query
React Hook Form
Zod
Lucide Icons
Backend
Node.js
Express.js
TypeScript
Prisma ORM
Database
PostgreSQL
Authentication
JWT
Refresh Tokens
bcrypt
File Storage
Cloudinary / AWS S3
Notifications
Socket.IO
Nodemailer
Charts
Recharts
📁 Suggested Project Structure
assetflow/
│
├── client/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── lib/
│   └── styles/
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── prisma/
│   │   ├── utils/
│   │   └── config/
│   │
│   └── prisma/
│
└── README.md
🚀 Getting Started
Clone the repository
git clone https://github.com/your-username/assetflow.git
cd assetflow
Install dependencies
npm install
Configure environment variables

Create a .env file.

DATABASE_URL=

JWT_SECRET=

JWT_REFRESH_SECRET=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=

SMTP_HOST=

SMTP_PORT=

SMTP_USER=

SMTP_PASS=
Run the application
npm run dev
📱 Responsive Design

AssetFlow is optimized for:

📱 Mobile
📲 Tablet
💻 Laptop
🖥 Desktop
🖥 Ultra-wide Displays
🔒 Security
JWT Authentication
Refresh Tokens
Password Hashing
Protected Routes
RBAC (Role-Based Access Control)
Input Validation
API Validation
Secure File Upload
SQL Injection Protection
XSS Protection
CSRF Best Practices
🎨 UI/UX Highlights
Modern Enterprise Dashboard
Responsive Sidebar
Dark & Light Theme
Smooth Animations
Glassmorphism (Minimal)
Professional Typography
Skeleton Loaders
Toast Notifications
Interactive Charts
Reusable Components
Clean, Minimal Design
📈 Future Enhancements
QR Code Scanner
Barcode Scanner
Mobile App
Offline Support
AI-powered Asset Insights
Predictive Maintenance
Multi-Organization Support
Multi-Language Support
Email & SMS Notifications
Calendar Integrations
RFID Asset Tracking

# Urban Nest: Project Roadmap & Implementation Strategy

---

## 🎯 Phase 1: Architecture & Data Modeling (Completed)
- [x] High-level Multi-Venture System Architecture [`SYSTEM_ARCHITECTURE.md`](file:///c:/Urban_Nest/architecture/SYSTEM_ARCHITECTURE.md)
- [x] Relational Database Schema & Prisma ERD [`DATABASE_SCHEMA.md`](file:///c:/Urban_Nest/architecture/DATABASE_SCHEMA.md)
- [x] Hierarchical Scoped RBAC Engine Specification [`RBAC_AND_PERMISSIONS.md`](file:///c:/Urban_Nest/architecture/RBAC_AND_PERMISSIONS.md)
- [x] RESTful API Contract Specification [`API_SPECIFICATION.md`](file:///c:/Urban_Nest/architecture/API_SPECIFICATION.md)

---

## 🚀 Phase 2: Backend API Implementation (`/backend`) (Completed in Node.js)
1. **Node.js Express + SQLite Architecture**:
   - Initialized ES module backend with `express`, `cors`, `jsonwebtoken`, `bcryptjs`, `sqlite3`, `dotenv`.
2. **Relational Schema & Migrations**:
   - Database tables with foreign keys and cascade rules for Ventures, Blocks, Floors, Flats, Owners, Amenities, Bookings, Invoices, Tickets.
3. **Comprehensive Seed Data**:
   - Pre-populated **Dharshini A** (4 Blocks, 16 Floors, 64 Flats, 8 Amenities).
   - Pre-populated **Dharshini B** (2 Blocks, 4 Floors, 16 Flats, Swimming Pool Only).
   - Pre-populated Unique Owners (Rajesh Kumar with multi-venture holdings in Dharshini A & B) and RBAC Personas.
   - Pre-populate **Dharshini B** (2 Blocks, 4 Floors, 16 Flats, 1 Amenity: Swimming Pool Only).
   - Pre-populate Owners (Unique owners with KYC records and multi-flat portfolios).
   - Pre-populate Users across roles:
     - `superadmin@urbannest.com` (Super Admin managing Dharshini A & B)
     - `admin.dharshiniA@urbannest.com` (Venture Admin)
     - `block.mgr@urbannest.com` (Block Manager for Block A)
     - `floor.mgr@urbannest.com` (Floor Manager for Floor 1)
     - `owner.rajesh@urbannest.com` (Owner with Flat 101 in Dharshini A & Flat 101 in Dharshini B)
4. **Hierarchical RBAC & Middleware**:
   - Token validation, tenant context injection, and resource authorization guards.
5. **API Endpoints & Controllers**:
   - Venture, Block, Floor, Flat, Owner, Amenity, Booking, Maintenance, and Ticket CRUD endpoints with validation.

---

## 🎨 Phase 3: Premium Interactive Frontend (`/frontend`)
1. **Modern React + Vite Client**:
   - Design System: Custom Glassmorphic Dark & Vibrant Luxury Theme with Google Fonts (*Outfit* + *Inter*).
2. **Key Views & Interactive Experiences**:
   - **Executive Super Admin Portal**: Cross-venture metrics, side-by-side comparison of Dharshini A vs Dharshini B, global revenue, and occupancy.
   - **Interactive Property Hierarchy Explorer**: Visual drill-down tree (Venture ➔ Block ➔ Floor ➔ Flat) showing real-time occupancy status, owner badges, and unit specs.
   - **Dynamic Amenity Hub**: Displays available amenities per venture (shows 8 amenities for Dharshini A, only Pool for Dharshini B), slot picker, live booking pass generator with QR code.
   - **Owner & Resident Portfolio**: Displays owned flats, maintenance dues with 1-click payment simulation, visitor passes, and amenity bookings.
   - **Operations & Manager Desk**: Floor & Block manager issue tracker with status workflow (Open ➔ In Progress ➔ Resolved).
   - **Role Switcher Widget**: Top-bar instant persona switcher allowing testing of all roles (Super Admin, Venture Admin, Block Manager, Floor Manager, Owner) with 1 click.

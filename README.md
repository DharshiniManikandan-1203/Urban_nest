# Urban Nest 🏢

**Multi-Venture Property & Community Management Platform**

Urban Nest is a full-stack real-time property operations system designed to manage multiple residential and commercial communities from a single interface. It provides strict data isolation across separate ventures, hierarchical role-based access, live IoT & utility telemetry, gate security, maintenance billing, and automated helpdesk escalation.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm**

### 2. Start the Backend (Port 8000)
```bash
cd backend
npm install
npm run dev
```
> The SQLite database (`urbannest.db`) automatically initializes and seeds with sample ventures, blocks, flats, smart meters, IoT sensors, and users on first launch.

### 3. Start the Frontend (Port 3000)
In a new terminal window:
```bash
cd frontend
npm start
```

### 4. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)**. The dashboard automatically logs in as Super Admin for demonstration.

---

## 🎭 Demo Personas & Quick Role Switcher

Use the top persona bar in the UI to switch between roles in 1 click, or log in manually with the following credentials (all use password: `Password@123`):

| Persona | Email | Role Scope & Permissions |
| :--- | :--- | :--- |
| **👑 Super Admin** | `superadmin@urbannest.com` | Global organization access. Can create ventures, override maintenance rates, and view all portfolios. |
| **🏢 Venture Admin (A)** | `admin.a@urbannest.com` | Scoped to **Dharshini A** (Luxury Enclave). Full control over blocks, amenities, and billing for Venture A. |
| **🏡 Venture Admin (B)** | `admin.b@urbannest.com` | Scoped to **Dharshini B** (Garden View). Isolated from Venture A. |
| **🧱 Block Manager** | `blockmgr.a@urbannest.com` | Scoped to Block A (Tower 1). Manages floor allocations and floor-level incidents. |
| **📶 Floor Manager** | `floormgr.a1@urbannest.com` | Scoped to 1st Floor of Block A. First responder for helpdesk tickets on their floor. |
| **🔑 Multi-Property Owner** | `owner.rajesh@urbannest.com` | Single identity owning **Flat 101 in Dharshini A** and **Flat 101 in Dharshini B**. |
| **🔑 Single-Flat Resident** | `owner.priya@urbannest.com` | Resident owner of Flat 102 in Dharshini A. Books amenities and views utility bills. |

---

## 🚀 Key Modules & Capabilities

### 1. Multi-Venture Hierarchy & Segregation
- **Data Model**: `Venture ➔ Blocks ➔ Floors ➔ Flats & Units`.
- Isolated financial ledgers, maintenance rates (e.g. ₹4.00/sq.ft vs ₹3.00/sq.ft), and amenity catalogs per venture.
- Add new ventures, blocks, and units dynamically with immediate database persistence.

### 2. 2D Architectural Floor Plan Visualizer
- Interactive CAD-style blueprint visualizer with block and floor selectors.
- Switchable real-time operational heatmap layers:
  - 🏠 **Occupancy Layer**: Owner-occupied, tenant-occupied, and vacant units.
  - 💳 **Billing Layer**: Paid vs pending maintenance dues.
  - ⚠️ **Incident Layer**: Flags flats with open helpdesk tickets.
  - ⚡ **Power Load Layer**: Dynamic electricity kW draw heat gradient.
- Click any flat unit to inspect deed numbers, carpet area, and assigned parking bays.

### 3. Real-Time Telemetry & Event Stream (SSE)
- Built on a native Server-Sent Events (SSE) bus at `/api/v1/realtime/stream`.
- Live background telemetry updates:
  - **Smart Sub-Meters**: Live electricity (kWh), water (Liters), and backup diesel generator (kWh) pulse updates every 8s.
  - **SCADA Infrastructure Array**: Continuous sensor telemetry for overhead water reservoirs, STP flow, elevator motor temperatures, and EV charging loads (every 4s).
  - **Critical Alert Injection**: Built-in anomaly simulator to test emergency alarms with Web Audio chimes and toast notifications.

### 4. Security Gatekeeper & Visitor Kiosk
- **Resident Pre-Approval**: Generate time-bound 6-digit OTP visitor passcodes (e.g. `PASS-3959`).
- **Guard Terminal**: Security check-in/check-out kiosk for guests, couriers, and cabs with vehicle number logging and live on-premises headcount.

### 5. Automated Utility & Maintenance Billing
- Computes base square-footage maintenance dues plus live smart sub-meter consumption.
- 1-click invoice generator producing itemized breakdowns (Electricity + Water + DG Backup + Common Maintenance).
- Simulated 1-click UPI / Net Banking payment flow with real-time status updates.

### 6. Hierarchical SLA Helpdesk & Auto-Escalation
- Ticket priority matrix with strict SLA countdown deadlines:
  - **Critical**: 2 hours
  - **High**: 4 hours
  - **Medium**: 12 hours
  - **Low**: 24 hours
- Automatic background escalation engine: if a floor manager does not resolve an open issue within the SLA window, the ticket climbs up to `Block Manager ➔ Venture Admin ➔ Super Admin`.

### 7. Immutable Cryptographic Audit Trail
- System-wide immutable security ledger logging venture creations, owner assignments, gate entries, emergency alerts, and financial settlements.

---

## 🛠️ Technology Stack

- **Backend**:
  - Node.js (ES Modules)
  - Express.js (REST API + Server-Sent Events)
  - SQLite3 (zero-configuration relational database with foreign key enforcement)
  - JSON Web Tokens (`jsonwebtoken`) & `bcryptjs` for authentication
- **Frontend**:
  - Vanilla JavaScript (Modern ES Modules — no heavy frameworks or compile step needed)
  - Custom Vanilla CSS Design System (dark theme, glassmorphism, responsive grid)
  - FontAwesome 6 icons
  - Web Audio API (real-time notification chimes)
- **Communication Protocol**:
  - RESTful JSON API (`/api/v1/*`)
  - Server-Sent Events (`/api/v1/realtime/stream`)

---

## 📁 Project Structure

```
Urban_Nest/
├── architecture/                 # Design documentation & specs
│   ├── API_SPECIFICATION.md      # Full REST API endpoint reference
│   ├── DATABASE_SCHEMA.md       # Table definitions & relationship diagrams
│   ├── PROJECT_ROADMAP.md        # Feature roadmap & milestones
│   ├── RBAC_AND_PERMISSIONS.md   # Role permission matrix
│   └── SYSTEM_ARCHITECTURE.md    # High-level architecture design
│
├── backend/                      # Node.js Express API Server
│   ├── src/
│   │   ├── config/               # App configuration & environment constants
│   │   ├── database/             # SQLite connection, schema, and seed data
│   │   ├── middleware/           # JWT auth & RBAC authorization middleware
│   │   ├── realtime/             # SSE connection manager & telemetry simulator
│   │   ├── routes/               # API route handlers (auth, ventures, iot, etc.)
│   │   ├── app.js                # Express application setup
│   │   └── server.js             # Server entrypoint (Port 8000)
│   ├── package.json
│   └── urbannest.db              # SQLite Database file
│
├── frontend/                     # Pure JS Dashboard Client
│   ├── css/
│   │   ├── design-system.css     # CSS variables, typography & base styles
│   │   ├── layout.css            # Shell, sidebar, header, and modal layouts
│   │   ├── components.css        # Reusable badges, buttons, cards & tables
│   │   └── views.css             # View-specific styles & floor plan grid
│   ├── js/
│   │   ├── components/           # UI components (header, sidebar, modals, toast)
│   │   ├── views/                # Modular view controllers (13 dashboard views)
│   │   ├── api.js                # HTTP client wrapper
│   │   ├── app.js                # Application entrypoint & view router
│   │   ├── config.js             # Client configuration
│   │   ├── realtime.js           # EventSource client & audio chime synthesizer
│   │   └── state.js              # Reactive state store
│   ├── index.html                # Single-page application shell
│   ├── package.json
│   └── server.js                 # Static file server (Port 3000)
│
└── README.md                     # Project documentation
```

---

## 📡 Key API Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT |
| | `POST` | `/api/v1/auth/register` | Register new user with role assignment |
| | `POST` | `/api/v1/auth/switch-context` | Switch active venture / role context |
| **Ventures** | `GET` | `/api/v1/ventures` | List all ventures with aggregate stats |
| | `POST` | `/api/v1/ventures` | Create new isolated venture |
| | `GET` | `/api/v1/ventures/:id/hierarchy` | Full hierarchy tree (blocks/floors/flats) |
| **Visitors** | `POST` | `/api/v1/visitors/pre-approve` | Generate OTP gate pass |
| | `POST` | `/api/v1/visitors/check-in` | Security check-in with pass code |
| | `POST` | `/api/v1/visitors/check-out` | Log visitor departure |
| **Utilities** | `GET` | `/api/v1/utilities/meters` | List flat smart sub-meters |
| | `POST` | `/api/v1/utilities/pulse` | Record consumption pulse |
| | `POST` | `/api/v1/utilities/generate-integrated-invoice` | Combine maintenance + utilities |
| **IoT SCADA** | `GET` | `/api/v1/iot/sensors` | List venture infrastructure sensors |
| | `POST` | `/api/v1/iot/simulate-spike` | Inject anomaly for live alert testing |
| **Helpdesk** | `GET` | `/api/v1/tickets` | List tickets with SLA status |
| | `POST` | `/api/v1/tickets/:id/escalate` | Manually escalate to higher management |
| **Realtime** | `GET` | `/api/v1/realtime/stream` | Server-Sent Events live event stream |
| **Audit** | `GET` | `/api/v1/audit/logs` | Query cryptographic audit trail |

---

## 🧪 Testing & Resetting the Database

If you want to reset the database to a fresh state with default seed data:
```bash
cd backend
npm run seed
```
This drops existing tables, recreates the schema, and reseeds initial ventures, residential towers, flats, smart sub-meters, IoT sensor nodes, and demo accounts.

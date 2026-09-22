import express from 'express';
import cors from 'cors';
import { CONFIG } from './config/config.js';

// Routers
import authRoutes from './routes/auth.routes.js';
import venturesRoutes from './routes/ventures.routes.js';
import blocksRoutes from './routes/blocks.routes.js';
import floorsRoutes from './routes/floors.routes.js';
import flatsRoutes from './routes/flats.routes.js';
import ownersRoutes from './routes/owners.routes.js';
import amenitiesRoutes from './routes/amenities.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import realtimeRoutes from './routes/realtime.routes.js';
import visitorsRoutes from './routes/visitors.routes.js';
import utilitiesRoutes from './routes/utilities.routes.js';
import iotRoutes from './routes/iot.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();

// Enable CORS for all origins (supports Vercel frontend, preview branches, and custom domains)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false
}));

app.use(express.json());

// Health check endpoint for Render service monitoring
app.get(['/health', `${CONFIG.API_PREFIX}/health`], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    platform: 'Urban Nest Backend',
    version: '1.0.0'
  });
});

// Register API v1 routes
app.use(`${CONFIG.API_PREFIX}/auth`, authRoutes);
app.use(`${CONFIG.API_PREFIX}/ventures`, venturesRoutes);
app.use(`${CONFIG.API_PREFIX}/blocks`, blocksRoutes);
app.use(`${CONFIG.API_PREFIX}/floors`, floorsRoutes);
app.use(`${CONFIG.API_PREFIX}/flats`, flatsRoutes);
app.use(`${CONFIG.API_PREFIX}/owners`, ownersRoutes);
app.use(`${CONFIG.API_PREFIX}/amenities`, amenitiesRoutes);
app.use(`${CONFIG.API_PREFIX}/bookings`, bookingsRoutes);
app.use(`${CONFIG.API_PREFIX}/maintenance`, maintenanceRoutes);
app.use(`${CONFIG.API_PREFIX}/tickets`, ticketsRoutes);
app.use(`${CONFIG.API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${CONFIG.API_PREFIX}/realtime`, realtimeRoutes);
app.use(`${CONFIG.API_PREFIX}/visitors`, visitorsRoutes);
app.use(`${CONFIG.API_PREFIX}/utilities`, utilitiesRoutes);
app.use(`${CONFIG.API_PREFIX}/iot`, iotRoutes);
app.use(`${CONFIG.API_PREFIX}/audit`, auditRoutes);

const apiInfo = {
  platform: 'Urban Nest PropTech Multi-Venture OS',
  runtime: 'Node.js Express',
  status: 'online',
  version: 'v1',
  apiPrefix: CONFIG.API_PREFIX,
  frontendApp: 'http://localhost:3000',
  endpoints: {
    auth: `${CONFIG.API_PREFIX}/auth (login, register, me, switch-context, demo-users)`,
    ventures: `${CONFIG.API_PREFIX}/ventures (list, hierarchy drill-down, create)`,
    visitors: `${CONFIG.API_PREFIX}/visitors (gatekeeper kiosk, pre-approve, check-in, check-out)`,
    utilities: `${CONFIG.API_PREFIX}/utilities (smart sub-meters, telemetry pulse, integrated invoices)`,
    iot: `${CONFIG.API_PREFIX}/iot (SCADA sensors, simulated anomaly spikes)`,
    tickets: `${CONFIG.API_PREFIX}/tickets (SLA helpdesk, auto-escalations)`,
    amenities: `${CONFIG.API_PREFIX}/amenities (catalog, venture amenities, slot booking)`,
    maintenance: `${CONFIG.API_PREFIX}/maintenance (invoices, sq.ft billing, 1-click pay)`,
    owners: `${CONFIG.API_PREFIX}/owners (unique portfolios, KYC, deeds)`,
    audit: `${CONFIG.API_PREFIX}/audit (cryptographic ledger audit trail)`,
    realtime: `${CONFIG.API_PREFIX}/realtime/stream (Server-Sent Events live stream)`
  }
};

app.get('/', (req, res) => {
  res.json(apiInfo);
});

app.get([CONFIG.API_PREFIX, `${CONFIG.API_PREFIX}/`], (req, res) => {
  res.json(apiInfo);
});

export default app;

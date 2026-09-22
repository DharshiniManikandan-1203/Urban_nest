import { state } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';
import { openAddVentureModal } from './ventureModal.js';
import { openRegisterModal } from './registerModal.js';
import { openApiConfigModal } from './apiConfigModal.js';
import { realtime } from '../realtime.js';

export function renderHeader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { currentUser, activeRole, activeVentureId, ventures, currentTab } = state.getState();

  const tabTitles = {
    dashboard: { title: 'Multi-Venture Executive Dashboard', desc: 'Real-time cross-property analytics, financial health, and occupancy' },
    hierarchy: { title: 'Venture & Property Hierarchy Visualizer', desc: 'Drill down from Venture ➔ Blocks ➔ Floors ➔ Flats & Owner segregation' },
    floorplan: { title: '2D Architectural Floor Plan Visualizer', desc: 'CAD building blueprint with multi-layer occupancy, billing, and power load heatmaps' },
    visitors: { title: 'Security Gatekeeper & Visitor Kiosk', desc: 'Pre-approved guest passes, delivery OTP verification, and live gate access logs' },
    utilities: { title: 'Smart Sub-Metering & Energy Hub', desc: 'Individual flat telemetry for electricity kWh, domestic water, and DG backup' },
    iot: { title: 'Live SCADA & IoT Infrastructure Array', desc: 'Real-time sensor telemetry for water reservoirs, sewage treatment, EV loads, and elevators' },
    amenities: { title: 'Amenities & Facilities Engine', desc: 'Dynamic amenities provisioning & resident slot booking with QR passes' },
    owners: { title: 'Unique Owner Directory & Portfolios', desc: 'Segregated owner identities and cross-venture property deeds' },
    flats: { title: 'Flats & Occupancy Management', desc: 'Unit specifications, carpet area, parking allocations, and occupancy audit' },
    bookings: { title: 'Amenity Bookings & QR Passes', desc: 'Resident slot reservations and digital gate security validation' },
    maintenance: { title: 'Maintenance Ledger & Invoicing', desc: 'Automated sq.ft dues billing and 1-click payment simulator' },
    tickets: { title: 'Hierarchical Helpdesk & SLA Escalation', desc: 'SLA countdown timers with automated multi-tier grievance escalation matrix' },
    audit: { title: 'Immutable Security & Operations Audit Trail', desc: 'Tamper-evident cryptographic ledger of all administrative and gate events' }
  };

  const currentInfo = tabTitles[currentTab] || { title: 'Urban Nest Platform', desc: 'Property OS' };

  container.innerHTML = `
    <div class="header-left">
      <div class="header-title-box">
        <h1>${currentInfo.title}</h1>
        <p>${currentInfo.desc}</p>
      </div>
    </div>
    <div class="header-right">
      <!-- Live Realtime Telemetry Status Pill -->
      <div id="realtime-status-pill" class="live-status-pill ${realtime.isConnected ? 'status-live' : 'status-offline'}">
        ${realtime.isConnected ? '<span class="live-pulse-dot"></span> LIVE TELEMETRY' : '<i class="fa-solid fa-circle-nodes"></i> RECONNECTING'}
      </div>

      <!-- Realtime Notification Bell & Tray -->
      <div class="notif-dropdown-container" style="position: relative;">
        <button class="btn btn-secondary btn-sm" id="btn-header-notifs" title="Real-Time Event Stream" style="position: relative; padding: 8px 12px;">
          <i class="fa-solid fa-bell"></i>
          <span id="notif-badge-count" class="notif-badge" style="display: ${realtime.unreadCount > 0 ? 'flex' : 'none'};">
            ${realtime.unreadCount}
          </span>
        </button>

        <div id="notif-tray-popup" class="notif-tray-popup glass-panel" style="display: none; position: absolute; right: 0; top: 44px; width: 340px; max-height: 420px; overflow-y: auto; z-index: 1000; padding: 16px; border: 1px solid var(--border-subtle); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            <strong style="font-size: 0.9rem;"><i class="fa-solid fa-bolt text-indigo-400"></i> Live Event Feed</strong>
            <button id="btn-clear-notifs" class="btn btn-sm" style="font-size: 0.72rem; padding: 2px 6px;">Clear</button>
          </div>
          <div id="notif-tray-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${realtime.notifications.length === 0 ? `
              <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 16px 0;">No new notifications</div>
            ` : realtime.notifications.slice(0, 10).map(n => `
              <div style="background: rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 6px; font-size: 0.78rem;">
                <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 0.7rem; margin-bottom: 2px;">
                  <span style="font-weight: 600; color: #818cf8;">${n.type.replace(/_/g, ' ')}</span>
                  <span>${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div style="color: #f8fafc;">${n.message}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Venture Selector -->
      <div class="venture-selector-container">
        <i class="fa-solid fa-hotel text-indigo-400"></i>
        <select class="venture-select" id="global-venture-dropdown">
          ${ventures.map(v => `
            <option value="${v.id}" ${v.id === activeVentureId ? 'selected' : ''}>
              ${v.name} (${v.code})
            </option>
          `).join('')}
        </select>
      </div>

      <button class="btn btn-primary btn-sm" id="btn-header-add-venture" title="Create New Venture">
        <i class="fa-solid fa-plus"></i> Add Venture
      </button>

      <button class="btn btn-secondary btn-sm" id="btn-header-register-user" title="Register New User">
        <i class="fa-solid fa-user-plus"></i> Register
      </button>

      <button class="btn btn-secondary btn-sm" id="btn-header-api-config" title="API Endpoint Settings (Render / Vercel)">
        <i class="fa-solid fa-cloud"></i> API
      </button>

      <div class="badge ${activeRole === 'SUPER_ADMIN' ? 'badge-primary' : (activeRole.includes('ADMIN') ? 'badge-cyan' : 'badge-purple')}">
        <i class="fa-solid fa-shield-halved"></i>
        ${activeRole}
      </div>
    </div>
  `;

  // Dropdown listeners
  const dropdown = document.getElementById('global-venture-dropdown');
  if (dropdown) {
    dropdown.onchange = (e) => {
      const selectedId = e.target.value;
      state.setState({ activeVentureId: selectedId });
      const selVenture = ventures.find(v => v.id === selectedId);
      showToast(`Switched active context to ${selVenture?.name}`, 'info');
    };
  }

  const addVentureBtn = document.getElementById('btn-header-add-venture');
  if (addVentureBtn) {
    addVentureBtn.onclick = () => openAddVentureModal();
  }

  const registerUserBtn = document.getElementById('btn-header-register-user');
  if (registerUserBtn) {
    registerUserBtn.onclick = () => openRegisterModal();
  }

  const apiConfigBtn = document.getElementById('btn-header-api-config');
  if (apiConfigBtn) {
    apiConfigBtn.onclick = () => openApiConfigModal();
  }

  // Notification Tray Toggle
  const notifBtn = document.getElementById('btn-header-notifs');
  const notifTray = document.getElementById('notif-tray-popup');
  if (notifBtn && notifTray) {
    notifBtn.onclick = (e) => {
      e.stopPropagation();
      const isVisible = notifTray.style.display === 'block';
      notifTray.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        realtime.clearUnread();
      }
    };

    document.addEventListener('click', (e) => {
      if (!notifTray.contains(e.target) && e.target !== notifBtn) {
        notifTray.style.display = 'none';
      }
    });
  }

  const clearBtn = document.getElementById('btn-clear-notifs');
  if (clearBtn) {
    clearBtn.onclick = () => {
      realtime.notifications = [];
      realtime.clearUnread();
      const list = document.getElementById('notif-tray-list');
      if (list) list.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 16px 0;">No new notifications</div>`;
    };
  }
}

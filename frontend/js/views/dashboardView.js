import { api } from '../api.js';
import { state } from '../state.js';
import { openAddVentureModal } from '../components/ventureModal.js';

export async function renderDashboardView(container) {
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading metrics...</div>`;

  try {
    const analyticsRes = await api.getAnalytics();
    const venturesRes = await api.getVentures();
    const data = analyticsRes.data;
    const ventures = venturesRes.data;

    const html = `
      <div class="dashboard-view animate-fade">
        <!-- Top Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card" style="--card-accent: #6366f1;">
            <div class="stat-info">
              <div class="stat-label">Total Ventures</div>
              <div class="stat-value">${ventures.length}</div>
              <div class="stat-desc">${ventures.map(v => v.name.split(' - ')[0]).join(', ')}</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(99, 102, 241, 0.15); --icon-color: #818cf8;">
              <i class="fa-solid fa-building-user"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #06b6d4;">
            <div class="stat-info">
              <div class="stat-label">Total Units & Flats</div>
              <div class="stat-value">${data.totalFlats}</div>
              <div class="stat-desc">${data.occupancy.occupancyRate}% Occupancy Rate</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(6, 182, 212, 0.15); --icon-color: #22d3ee;">
              <i class="fa-solid fa-door-closed"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #10b981;">
            <div class="stat-info">
              <div class="stat-label">Maintenance Collected</div>
              <div class="stat-value">₹${data.financials.collected.toLocaleString()}</div>
              <div class="stat-desc">₹${data.financials.pending.toLocaleString()} Pending dues</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(16, 185, 129, 0.15); --icon-color: #34d399;">
              <i class="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #f59e0b;">
            <div class="stat-info">
              <div class="stat-label">Active Amenities</div>
              <div class="stat-value">${data.totalAmenitiesEnabled}</div>
              <div class="stat-desc">${data.totalBookings} Resident Bookings</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(245, 158, 11, 0.15); --icon-color: #fbbf24;">
              <i class="fa-solid fa-dumbbell"></i>
            </div>
          </div>
        </div>

        <!-- Venture Comparison Section Header & Add Venture Button -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">Venture Overview & Segregation</h2>
            <p style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 2px;">
              Cross-venture property portfolio and isolated management domains
            </p>
          </div>
          <button class="btn btn-primary" id="btn-dashboard-add-venture">
            <i class="fa-solid fa-plus"></i> Add New Venture
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px; margin-bottom: 32px;">
          ${ventures.map(v => `
            <div class="glass-panel" style="padding: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 1.2rem; color: #f8fafc;">${v.name}</h3>
                  <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                    <i class="fa-solid fa-location-dot text-indigo-400"></i> ${v.address}, ${v.city}
                  </p>
                </div>
                <span class="badge ${v.code === 'DHAR-A' ? 'badge-primary' : (v.code === 'DHAR-B' ? 'badge-cyan' : 'badge-purple')}">${v.code}</span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: rgba(0,0,0,0.25); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 16px;">
                <div style="text-align: center;">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">BLOCKS</div>
                  <div style="font-size: 1.2rem; font-weight: 700; color: #f8fafc;">${v.total_blocks || 0}</div>
                </div>
                <div style="text-align: center; border-left: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle);">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">TOTAL FLATS</div>
                  <div style="font-size: 1.2rem; font-weight: 700; color: #f8fafc;">${v.total_flats || 0}</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">AMENITIES</div>
                  <div style="font-size: 1.2rem; font-weight: 700; color: ${v.code === 'DHAR-A' ? '#818cf8' : '#22d3ee'};">
                    ${v.total_amenities || 0} Active
                  </div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem; color: var(--text-secondary);">
                <span>Maintenance Rate: <strong style="color: #34d399;">₹${v.maintenance_rate}/sq.ft</strong></span>
                <button class="btn btn-secondary btn-sm" onclick="window.app.navigateTo('hierarchy', '${v.id}')">
                  Explore Structure <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Occupancy & Health Breakdown -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <div class="glass-panel" style="padding: 24px;">
            <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Occupancy Distribution</h3>
            <div style="display: flex; gap: 20px; align-items: center;">
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                  <span>Owner Occupied</span>
                  <strong style="color: #34d399;">${data.occupancy.ownerOccupied} units</strong>
                </div>
                <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; margin-bottom: 14px;">
                  <div style="width: ${(data.occupancy.ownerOccupied / (data.totalFlats || 1) * 100) || 0}%; height: 100%; background: #10b981;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                  <span>Tenant Occupied</span>
                  <strong style="color: #22d3ee;">${data.occupancy.tenantOccupied} units</strong>
                </div>
                <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; margin-bottom: 14px;">
                  <div style="width: ${(data.occupancy.tenantOccupied / (data.totalFlats || 1) * 100) || 0}%; height: 100%; background: #06b6d4;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.85rem;">
                  <span>Vacant Units</span>
                  <strong style="color: var(--text-muted);">${data.occupancy.vacant} units</strong>
                </div>
                <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${(data.occupancy.vacant / (data.totalFlats || 1) * 100) || 0}%; height: 100%; background: #64748b;"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-panel" style="padding: 24px;">
            <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Quick Action Shortcuts</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary" id="btn-shortcut-add-venture">
                <i class="fa-solid fa-plus-circle"></i> Add New Venture
              </button>
              <button class="btn btn-secondary" onclick="window.app.navigateTo('amenities')">
                <i class="fa-solid fa-calendar-plus"></i> Book Amenity Slot
              </button>
              <button class="btn btn-secondary" onclick="window.app.navigateTo('owners')">
                <i class="fa-solid fa-users"></i> View Owner Portfolios
              </button>
              <button class="btn btn-secondary" onclick="window.app.navigateTo('maintenance')">
                <i class="fa-solid fa-receipt"></i> Generate Monthly Bills
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const addVentureBtn = container.querySelector('#btn-dashboard-add-venture');
    if (addVentureBtn) {
      addVentureBtn.onclick = () => openAddVentureModal();
    }

    const shortcutAddVentureBtn = container.querySelector('#btn-shortcut-add-venture');
    if (shortcutAddVentureBtn) {
      shortcutAddVentureBtn.onclick = () => openAddVentureModal();
    }

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading dashboard: ${err.message}</div>`;
  }
}

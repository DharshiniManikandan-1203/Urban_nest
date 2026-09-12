import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { realtime } from '../realtime.js';

export async function renderVisitorView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading Gate & Visitor Management...</div>`;

  try {
    const [statsRes, visitorsRes, flatsRes] = await Promise.all([
      api.getVisitorStats(activeVentureId),
      api.getVisitors({ venture_id: activeVentureId }),
      api.getFlats({ venture_id: activeVentureId })
    ]);

    const stats = statsRes.data;
    const visitors = visitorsRes.data;
    const flats = flatsRes.data;

    const html = `
      <div class="visitor-view animate-fade">
        <!-- Top Stats Row -->
        <div class="stats-grid" style="margin-bottom: 24px;">
          <div class="stat-card" style="--card-accent: #6366f1;">
            <div class="stat-info">
              <div class="stat-label">Currently On-Premises</div>
              <div class="stat-value" id="stat-inside-count">${stats.currentlyInside}</div>
              <div class="stat-desc">Checked-in & Active on site</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(99, 102, 241, 0.15); --icon-color: #818cf8;">
              <i class="fa-solid fa-door-open"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #06b6d4;">
            <div class="stat-info">
              <div class="stat-label">Expected / Pre-Approved</div>
              <div class="stat-value">${stats.expected}</div>
              <div class="stat-desc">Awaiting arrival at gate</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(6, 182, 212, 0.15); --icon-color: #22d3ee;">
              <i class="fa-solid fa-clock"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #f59e0b;">
            <div class="stat-info">
              <div class="stat-label">Delivery Entries Today</div>
              <div class="stat-value">${stats.deliveries}</div>
              <div class="stat-desc">Couriers & Services</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(245, 158, 11, 0.15); --icon-color: #fbbf24;">
              <i class="fa-solid fa-truck-fast"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #10b981;">
            <div class="stat-info">
              <div class="stat-label">Total Visits Logged</div>
              <div class="stat-value">${stats.total}</div>
              <div class="stat-desc">Historical gate records</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(16, 185, 129, 0.15); --icon-color: #34d399;">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
          </div>
        </div>

        <!-- Guard Verification Kiosk & Quick Actions -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <!-- Guard Scanner Kiosk -->
          <div class="glass-panel" style="padding: 24px; border: 1px solid rgba(99, 102, 241, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; color: #818cf8;">
                  <i class="fa-solid fa-qrcode text-lg"></i>
                </div>
                <div>
                  <h3 style="font-size: 1.1rem; font-weight: 700;">Security Guard Gate Kiosk</h3>
                  <p style="font-size: 0.8rem; color: var(--text-secondary);">Verify incoming visitor pass or host phone number</p>
                </div>
              </div>
              <span class="badge badge-success"><span class="live-pulse-dot"></span> Gate 1 Active</span>
            </div>

            <form id="guard-checkin-form" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="form-group">
                  <label class="form-label">Passcode (e.g. PASS-8821)</label>
                  <input type="text" id="kiosk-passcode" class="form-control" placeholder="PASS-XXXX" style="text-transform: uppercase; font-weight: 700; letter-spacing: 1px;" />
                </div>
                <div class="form-group">
                  <label class="form-label">Or Visitor Phone Number</label>
                  <input type="tel" id="kiosk-phone" class="form-control" placeholder="+91 98XXX XXXXX" />
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px;">
                <i class="fa-solid fa-id-card-clip"></i> Validate & Check-In Visitor
              </button>
            </form>
          </div>

          <!-- Resident Pass Creator Banner -->
          <div class="glass-panel" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; color: #34d399;">
                  <i class="fa-solid fa-ticket text-lg"></i>
                </div>
                <div>
                  <h3 style="font-size: 1.1rem; font-weight: 700;">Resident Visitor Pre-Approval</h3>
                  <p style="font-size: 0.8rem; color: var(--text-secondary);">Generate guest passes, delivery OTPs & cab entry authorizations</p>
                </div>
              </div>
              <p style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
                Pre-approved visitors can enter smoothly via OCR license plate recognition or instant OTP verification at the security booth without calling the flat intercom.
              </p>
            </div>
            <button class="btn btn-secondary" id="btn-open-visitor-modal" style="width: 100%; justify-content: center; padding: 12px;">
              <i class="fa-solid fa-user-plus"></i> Pre-Approve New Visitor Pass
            </button>
          </div>
        </div>

        <!-- Live Gate Activity Log Table -->
        <div class="glass-panel" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 700;">Live Visitor Activity & Access Logs</h3>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Real-time stream of gate check-ins, active guests, and passcodes</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-refresh-visitors">
              <i class="fa-solid fa-arrows-rotate"></i> Refresh Feed
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table" id="visitor-table">
              <thead>
                <tr>
                  <th>Pass Code</th>
                  <th>Visitor Details</th>
                  <th>Type</th>
                  <th>Destination Unit</th>
                  <th>Vehicle</th>
                  <th>Entry Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="visitor-table-body">
                ${visitors.map(v => renderVisitorRow(v)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Kiosk Submit
    const kioskForm = container.querySelector('#guard-checkin-form');
    if (kioskForm) {
      kioskForm.onsubmit = async (e) => {
        e.preventDefault();
        const code = container.querySelector('#kiosk-passcode').value.trim();
        const phone = container.querySelector('#kiosk-phone').value.trim();
        try {
          const res = await api.checkInVisitor(code, phone);
          showToast(res.message, 'success');
          container.querySelector('#kiosk-passcode').value = '';
          container.querySelector('#kiosk-phone').value = '';
          renderVisitorView(container);
        } catch (err) {
          showToast(`Check-in failed: ${err.message}`, 'error');
        }
      };
    }

    // Attach Pre-Approve Modal
    const modalBtn = container.querySelector('#btn-open-visitor-modal');
    if (modalBtn) {
      modalBtn.onclick = () => openPreApproveModal(flats, activeVentureId, () => renderVisitorView(container));
    }

    // Attach Refresh
    const refreshBtn = container.querySelector('#btn-refresh-visitors');
    if (refreshBtn) {
      refreshBtn.onclick = () => renderVisitorView(container);
    }

    // Attach Check-out buttons
    container.querySelectorAll('.btn-checkout').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          await api.checkOutVisitor(id);
          showToast('Visitor marked as checked-out', 'info');
          renderVisitorView(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });

    // Subscribe to live gate events
    realtime.on('GATE_ENTRY_RECORDED', () => {
      renderVisitorView(container);
    });
    realtime.on('GATE_EXIT_RECORDED', () => {
      renderVisitorView(container);
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading Visitor Engine: ${err.message}</div>`;
  }
}

function renderVisitorRow(v) {
  const isInside = v.status === 'CHECKED_IN';
  const typeBadgeMap = {
    GUEST: 'badge-primary',
    DELIVERY: 'badge-warning',
    CAB: 'badge-cyan',
    SERVICE: 'badge-purple'
  };

  return `
    <tr id="row-vis-${v.id}">
      <td>
        <span style="font-family: monospace; font-weight: 700; color: #818cf8; background: rgba(99, 102, 241, 0.1); padding: 4px 8px; border-radius: 4px;">
          ${v.pass_code}
        </span>
      </td>
      <td>
        <div style="font-weight: 600;">${v.visitor_name}</div>
        <div style="font-size: 0.75rem; color: var(--text-secondary);"><i class="fa-solid fa-phone"></i> ${v.visitor_phone}</div>
      </td>
      <td>
        <span class="badge ${typeBadgeMap[v.visitor_type] || 'badge-secondary'}">${v.visitor_type}</span>
      </td>
      <td>
        <strong>Flat ${v.flat_number}</strong>
        <div style="font-size: 0.75rem; color: var(--text-secondary);">${v.host_name || 'Host'}</div>
      </td>
      <td>
        <span style="font-size: 0.82rem; font-family: monospace;">${v.vehicle_number || '<em style="color:var(--text-muted)">Walk-in</em>'}</span>
      </td>
      <td>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">
          ${v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not arrived'}
        </span>
      </td>
      <td>
        <span class="badge ${isInside ? 'badge-success' : (v.status === 'APPROVED' ? 'badge-cyan' : 'badge-danger')}">
          ${isInside ? '<span class="live-pulse-dot"></span> INSIDE' : v.status}
        </span>
      </td>
      <td>
        ${isInside ? `
          <button class="btn btn-secondary btn-sm btn-checkout" data-id="${v.id}">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Check-Out
          </button>
        ` : `
          <span style="color: var(--text-muted); font-size: 0.78rem;">Completed</span>
        `}
      </td>
    </tr>
  `;
}

function openPreApproveModal(flats, ventureId, onSuccess) {
  const bodyHtml = `
    <form id="pre-approve-form" style="display: flex; flex-direction: column; gap: 14px;">
      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Visitor Full Name *</label>
          <input type="text" id="pass-name" class="form-control" placeholder="e.g. Ramesh Kulkarni" required />
        </div>
        <div class="form-group">
          <label class="form-label">Visitor Phone Number *</label>
          <input type="tel" id="pass-phone" class="form-control" placeholder="+91 98765 43210" required />
        </div>
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Visitor Category *</label>
          <select id="pass-type" class="form-control">
            <option value="GUEST" selected>👥 Personal Guest / Family</option>
            <option value="DELIVERY">📦 Delivery (Amazon/Swiggy/Courier)</option>
            <option value="CAB">🚖 Cab / Driver (Uber/Ola)</option>
            <option value="SERVICE">🛠️ Home Service / Technician / Maid</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Destination Flat *</label>
          <select id="pass-flat" class="form-control" required>
            ${flats.map(f => `<option value="${f.id}">Unit ${f.flat_number} (${f.block_name || 'Block'})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Vehicle Reg. Number (Optional)</label>
          <input type="text" id="pass-vehicle" class="form-control" placeholder="e.g. TS-09-AB-1234" style="text-transform: uppercase;" />
        </div>
        <div class="form-group">
          <label class="form-label">Pass Validity Window</label>
          <select id="pass-validity" class="form-control">
            <option value="4">4 Hours (Quick Visit)</option>
            <option value="12">12 Hours (Half Day)</option>
            <option value="24" selected>24 Hours (Full Day)</option>
            <option value="72">3 Days (Long Stay Guest)</option>
          </select>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 0 0; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle);">
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-submit-pass">
          <i class="fa-solid fa-qrcode"></i> Generate Digital Pass
        </button>
      </div>
    </form>
  `;

  Modal.show({
    title: '🎟️ Generate Pre-Approved Visitor Pass',
    bodyHtml,
    size: 'lg'
  });

  const form = document.getElementById('pre-approve-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-pass');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;

      try {
        const payload = {
          visitor_name: document.getElementById('pass-name').value.trim(),
          visitor_phone: document.getElementById('pass-phone').value.trim(),
          visitor_type: document.getElementById('pass-type').value,
          flat_id: document.getElementById('pass-flat').value,
          venture_id: ventureId,
          vehicle_number: document.getElementById('pass-vehicle').value.trim(),
          valid_hours: document.getElementById('pass-validity').value
        };

        const res = await api.preApproveVisitor(payload);
        showToast(`Pass ${res.data.pass_code} generated for ${payload.visitor_name}`, 'success');
        Modal.hide();
        if (onSuccess) onSuccess();
      } catch (err) {
        showToast(`Failed to create pass: ${err.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-qrcode"></i> Generate Digital Pass`;
      }
    };
  }
}

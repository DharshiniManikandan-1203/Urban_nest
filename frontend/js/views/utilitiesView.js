import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { realtime } from '../realtime.js';

export async function renderUtilitiesView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading Smart Sub-Metering Hub...</div>`;

  try {
    const [metersRes, flatsRes] = await Promise.all([
      api.getSmartMeters({ venture_id: activeVentureId }),
      api.getFlats({ venture_id: activeVentureId })
    ]);

    const meters = metersRes.data;
    const flats = flatsRes.data;

    let totalElec = 0;
    let totalWater = 0;
    let totalDG = 0;

    meters.forEach(m => {
      if (m.meter_type === 'ELECTRICITY') totalElec += m.current_reading;
      if (m.meter_type === 'WATER') totalWater += m.current_reading;
      if (m.meter_type === 'DG_BACKUP') totalDG += m.current_reading;
    });

    const html = `
      <div class="utilities-view animate-fade">
        <!-- Top Metrics Row -->
        <div class="stats-grid" style="margin-bottom: 24px;">
          <div class="stat-card" style="--card-accent: #f59e0b;">
            <div class="stat-info">
              <div class="stat-label">Total Grid Electricity</div>
              <div class="stat-value" id="total-elec-stat">${totalElec.toFixed(1)} <span style="font-size: 0.9rem;">kWh</span></div>
              <div class="stat-desc">Tariff: ₹7.50 / kWh</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(245, 158, 11, 0.15); --icon-color: #fbbf24;">
              <i class="fa-solid fa-bolt"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #06b6d4;">
            <div class="stat-info">
              <div class="stat-label">Domestic Water Consumption</div>
              <div class="stat-value" id="total-water-stat">${(totalWater / 1000).toFixed(1)} <span style="font-size: 0.9rem;">kL</span></div>
              <div class="stat-desc">Tariff: ₹40 / 1,000 Liters</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(6, 182, 212, 0.15); --icon-color: #22d3ee;">
              <i class="fa-solid fa-droplet"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #ef4444;">
            <div class="stat-info">
              <div class="stat-label">Diesel Gen (DG) Backup</div>
              <div class="stat-value" id="total-dg-stat">${totalDG.toFixed(1)} <span style="font-size: 0.9rem;">kWh</span></div>
              <div class="stat-desc">Tariff: ₹18.00 / kWh</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(239, 68, 68, 0.15); --icon-color: #f87171;">
              <i class="fa-solid fa-car-battery"></i>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #10b981;">
            <div class="stat-info">
              <div class="stat-label">Active Sub-Meters</div>
              <div class="stat-value">${meters.length}</div>
              <div class="stat-desc">Telemetry Online 100%</div>
            </div>
            <div class="stat-icon-wrapper" style="--icon-bg: rgba(16, 185, 129, 0.15); --icon-color: #34d399;">
              <i class="fa-solid fa-gauge-high"></i>
            </div>
          </div>
        </div>

        <!-- Smart Meter Telemetry Grid -->
        <div class="glass-panel" style="padding: 24px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 700;">Sub-Meter Live Readings & Telemetry Stream</h3>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">Real-time IoT sub-meters mapped to individual residential units</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm" id="btn-pulse-random">
                <i class="fa-solid fa-bolt-lightning text-amber-400"></i> Pulse Random Meter
              </button>
              <button class="btn btn-primary btn-sm" id="btn-integrated-bill">
                <i class="fa-solid fa-file-invoice-dollar"></i> Generate Integrated Bill
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table" id="meters-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Meter Type</th>
                  <th>Serial Number</th>
                  <th>Live Reading</th>
                  <th>Rate / Unit</th>
                  <th>Estimated Cost</th>
                  <th>Last Sync</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="meters-table-body">
                ${meters.map(m => {
                  const typeIcon = m.meter_type === 'ELECTRICITY' ? 'fa-bolt text-amber-400' 
                    : (m.meter_type === 'WATER' ? 'fa-droplet text-cyan-400' : 'fa-car-battery text-rose-400');
                  
                  return `
                    <tr id="meter-row-${m.id}">
                      <td><strong>Unit ${m.flat_number}</strong></td>
                      <td>
                        <span style="display: flex; align-items: center; gap: 6px;">
                          <i class="fa-solid ${typeIcon}"></i> ${m.meter_type}
                        </span>
                      </td>
                      <td><span style="font-family: monospace; font-size: 0.82rem;">${m.meter_serial}</span></td>
                      <td>
                        <span class="meter-live-val" id="val-${m.id}" style="font-weight: 700; color: #f8fafc; font-family: monospace;">
                          ${m.current_reading.toLocaleString()} ${m.unit_type}
                        </span>
                      </td>
                      <td>₹${m.rate_per_unit}/${m.unit_type}</td>
                      <td>
                        <strong style="color: #34d399;">₹${(m.current_reading * m.rate_per_unit).toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                      </td>
                      <td><span style="font-size: 0.78rem; color: var(--text-secondary);"><span class="live-pulse-dot"></span> Live</span></td>
                      <td>
                        <button class="btn btn-secondary btn-sm btn-pulse-meter" data-id="${m.id}" title="Simulate consumption pulse">
                          <i class="fa-solid fa-plus text-indigo-400"></i> Pulse
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Pulse Buttons
    container.querySelectorAll('.btn-pulse-meter').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          await api.pulseMeter(id, 2.5);
          showToast('Meter pulse recorded', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });

    const randomPulseBtn = container.querySelector('#btn-pulse-random');
    if (randomPulseBtn && meters.length > 0) {
      randomPulseBtn.onclick = async () => {
        const randomMeter = meters[Math.floor(Math.random() * meters.length)];
        try {
          await api.pulseMeter(randomMeter.id, 5.0);
          showToast(`Pulsed ${randomMeter.meter_type} for Unit ${randomMeter.flat_number}`, 'info');
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    }

    const billBtn = container.querySelector('#btn-integrated-bill');
    if (billBtn) {
      billBtn.onclick = () => openIntegratedBillModal(flats);
    }

    // Subscribe to live meter ticks
    realtime.on('SMART_METER_TICK', (data) => {
      const valEl = document.getElementById(`val-${data.meterId}`);
      if (valEl) {
        valEl.textContent = `${data.currentReading.toLocaleString()} ${data.unitType}`;
        valEl.style.color = '#34d399';
        setTimeout(() => { valEl.style.color = '#f8fafc'; }, 1200);
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading Smart Utilities: ${err.message}</div>`;
  }
}

function openIntegratedBillModal(flats) {
  const bodyHtml = `
    <form id="integrated-bill-form" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 12px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
        <i class="fa-solid fa-calculator text-indigo-400"></i> Consolidates Base Area Maintenance (sq.ft) + Sub-Metered Electricity, Water, and DG Backup usage into a single unified ledger invoice.
      </div>

      <div class="form-group">
        <label class="form-label">Select Residential Unit *</label>
        <select id="bill-flat-id" class="form-control" required>
          ${flats.map(f => `<option value="${f.id}">Unit ${f.flat_number} (${f.built_up_area_sqft} sq.ft, ${f.block_name || 'Block'})</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Billing Cycle Month *</label>
        <input type="month" id="bill-month" class="form-control" value="${new Date().toISOString().slice(0, 7)}" required />
      </div>

      <div id="bill-preview-box" class="glass-panel" style="padding: 14px; font-size: 0.85rem; display: none;">
        <!-- Filled dynamically -->
      </div>

      <div class="modal-footer" style="padding: 12px 0 0; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle);">
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-submit-bill">
          <i class="fa-solid fa-receipt"></i> Issue Consolidated Bill
        </button>
      </div>
    </form>
  `;

  Modal.show({
    title: '🧾 Generate Integrated Maintenance & Utility Invoice',
    bodyHtml,
    size: 'md'
  });

  const form = document.getElementById('integrated-bill-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-bill');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;

      try {
        const flatId = document.getElementById('bill-flat-id').value;
        const month = document.getElementById('bill-month').value;
        const res = await api.generateIntegratedInvoice(flatId, month);
        showToast(res.message, 'success');
        Modal.hide();
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-receipt"></i> Issue Consolidated Bill`;
      }
    };
  }
}

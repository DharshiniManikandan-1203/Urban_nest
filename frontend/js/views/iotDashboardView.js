import { api } from '../api.js';
import { state } from '../state.js';
import { showToast } from '../components/toast.js';
import { realtime } from '../realtime.js';

export async function renderIoTDashboardView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading IoT Infrastructure Telemetry...</div>`;

  try {
    const res = await api.getIoTSensors(activeVentureId);
    const sensors = res.data;

    const html = `
      <div class="iot-dashboard-view animate-fade">
        <!-- Infrastructure Status Header -->
        <div class="glass-panel" style="padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.3rem;">
              <i class="fa-solid fa-tower-broadcast"></i>
            </div>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 700;">Infrastructure SCADA & IoT Sensor Array</h2>
              <p style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 2px;">
                Real-time telemetry monitoring water tanks, sewage treatment, power loads, elevators, and fire systems
              </p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="live-status-pill status-live"><span class="live-pulse-dot"></span> LIVE 4s TELEMETRY</span>
          </div>
        </div>

        <!-- Sensors Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
          ${sensors.map(s => renderSensorCard(s)).join('')}
        </div>

        <!-- Anomaly Simulation Bench -->
        <div class="glass-panel" style="padding: 24px; border: 1px solid rgba(239, 68, 68, 0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="font-size: 1.1rem; font-weight: 700; color: #f87171;">
                <i class="fa-solid fa-triangle-exclamation"></i> Emergency Fault & Anomaly Injection Workbench
              </h3>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                Simulate critical threshold breaches (e.g. Tank low water, EV charger overload, Elevator motor heat) to test real-time alarms.
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              ${sensors.map(s => `
                <button class="btn btn-danger btn-sm btn-simulate-spike" data-id="${s.id}">
                  Spike ${s.sensor_type.split('_')[0]}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Spike and Reset Buttons
    container.querySelectorAll('.btn-simulate-spike').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          await api.simulateIoTSpike(id);
          showToast('Critical Anomaly Injected into Stream!', 'error');
          renderIoTDashboardView(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });

    container.querySelectorAll('.btn-reset-sensor').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          await api.resetIoTSensor(id);
          showToast('Sensor restored to Normal state', 'success');
          renderIoTDashboardView(container);
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });

    // Real-time updates
    realtime.on('IOT_TELEMETRY_UPDATE', (data) => {
      const valEl = document.getElementById(`sensor-val-${data.sensorId}`);
      const barEl = document.getElementById(`sensor-bar-${data.sensorId}`);
      const badgeEl = document.getElementById(`sensor-badge-${data.sensorId}`);

      if (valEl) {
        valEl.textContent = `${data.currentValue} ${data.unit}`;
      }
      if (barEl) {
        const pct = Math.min(100, Math.max(5, (data.currentValue / 100) * 100));
        barEl.style.width = `${pct}%`;
      }
      if (badgeEl) {
        badgeEl.className = `badge ${data.status === 'NORMAL' ? 'badge-success' : 'badge-danger'}`;
        badgeEl.textContent = data.status;
      }
    });

    realtime.on('IOT_CRITICAL_ALERT', () => {
      renderIoTDashboardView(container);
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading IoT Dashboard: ${err.message}</div>`;
  }
}

function renderSensorCard(s) {
  const isCritical = s.status === 'CRITICAL';
  const isWarning = s.status === 'WARNING';
  
  const iconMap = {
    WATER_TANK_LEVEL: 'fa-water text-cyan-400',
    STP_FLOW: 'fa-recycle text-emerald-400',
    EV_LOAD_KW: 'fa-bolt text-amber-400',
    ELEVATOR_HEALTH: 'fa-elevator text-indigo-400',
    FIRE_PRESSURE: 'fa-fire-extinguisher text-rose-400',
    SOLAR_GRID: 'fa-solar-panel text-yellow-400',
    DG_BACKUP: 'fa-gas-pump text-orange-400'
  };

  const pct = Math.min(100, Math.max(5, (s.current_value / (s.max_threshold || 100)) * 100));

  return `
    <div class="glass-panel" id="card-sensor-${s.id}" style="padding: 20px; border-left: 4px solid ${isCritical ? '#ef4444' : (isWarning ? '#f59e0b' : '#10b981')};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid ${iconMap[s.sensor_type] || 'fa-gauge'} text-xl"></i>
          <div>
            <h4 style="font-size: 0.98rem; font-weight: 700; color: #f8fafc;">${s.sensor_name}</h4>
            <span style="font-size: 0.75rem; color: var(--text-secondary);"><i class="fa-solid fa-location-dot"></i> ${s.location}</span>
          </div>
        </div>
        <span id="sensor-badge-${s.id}" class="badge ${isCritical ? 'badge-danger' : (isWarning ? 'badge-warning' : 'badge-success')}">
          ${s.status}
        </span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <span style="font-size: 0.78rem; color: var(--text-muted);">CURRENT TELEMETRY</span>
        <span id="sensor-val-${s.id}" style="font-size: 1.4rem; font-weight: 700; color: #f8fafc; font-family: monospace;">
          ${s.current_value} <span style="font-size: 0.85rem; color: var(--text-secondary);">${s.unit}</span>
        </span>
      </div>

      <!-- Live Bar -->
      <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 12px;">
        <div id="sensor-bar-${s.id}" style="height: 100%; width: ${pct}%; background: ${isCritical ? '#ef4444' : (isWarning ? '#f59e0b' : '#6366f1')}; transition: width 0.8s ease;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--text-muted);">
        <span>Threshold: ${s.min_threshold} – ${s.max_threshold} ${s.unit}</span>
        ${isCritical ? `
          <button class="btn btn-secondary btn-sm btn-reset-sensor" data-id="${s.id}" style="padding: 2px 8px; font-size: 0.75rem;">
            <i class="fa-solid fa-rotate-left"></i> Reset
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

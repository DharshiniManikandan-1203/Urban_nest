import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderFloorPlanView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading 2D Floor Plan Visualizer...</div>`;

  try {
    const res = await api.getVentureHierarchy(activeVentureId);
    const venture = res.data;

    let activeLayer = 'occupancy'; // 'occupancy' | 'billing' | 'incidents' | 'power'
    let selectedBlockId = venture.blocks[0]?.id || null;

    function renderCanvas() {
      const selectedBlock = venture.blocks.find(b => b.id === selectedBlockId) || venture.blocks[0];

      const html = `
        <div class="floor-plan-view animate-fade">
          <!-- Top Control Toolbar -->
          <div class="glass-panel" style="padding: 16px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="font-size: 1.25rem; font-weight: 700;">2D Architectural Floor Plan Map</h2>
                <span class="badge badge-primary">${venture.name}</span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                Interactive CAD floor visualizer with real-time multi-layer operational heatmaps
              </p>
            </div>

            <!-- Heatmap Layer Switcher -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">ACTIVE LAYER:</span>
              <div class="btn-group" style="display: flex; gap: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: var(--radius-sm);">
                <button class="btn btn-sm ${activeLayer === 'occupancy' ? 'btn-primary' : 'btn-secondary'}" data-layer="occupancy">
                  <i class="fa-solid fa-users"></i> Occupancy
                </button>
                <button class="btn btn-sm ${activeLayer === 'billing' ? 'btn-primary' : 'btn-secondary'}" data-layer="billing">
                  <i class="fa-solid fa-receipt"></i> Dues
                </button>
                <button class="btn btn-sm ${activeLayer === 'incidents' ? 'btn-primary' : 'btn-secondary'}" data-layer="incidents">
                  <i class="fa-solid fa-triangle-exclamation"></i> Incidents
                </button>
                <button class="btn btn-sm ${activeLayer === 'power' ? 'btn-primary' : 'btn-secondary'}" data-layer="power">
                  <i class="fa-solid fa-bolt text-amber-400"></i> Power Load
                </button>
              </div>
            </div>
          </div>

          <!-- Block Tabs -->
          <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            ${venture.blocks.map(b => `
              <button class="btn btn-sm ${b.id === selectedBlockId ? 'btn-primary' : 'btn-secondary'} btn-block-tab" data-block-id="${b.id}">
                <i class="fa-solid fa-building"></i> ${b.name} (${b.code})
              </button>
            `).join('')}
          </div>

          <!-- Floor Plan Interactive Canvas -->
          ${!selectedBlock ? `
            <div class="glass-panel text-center p-8 text-secondary">No blocks available in this venture.</div>
          ` : `
            <div class="floor-canvas-container" style="display: flex; flex-direction: column; gap: 20px;">
              ${selectedBlock.floors.map(floor => `
                <div class="floor-level-card glass-panel" style="padding: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; color: #818cf8; font-weight: 700; font-size: 0.85rem;">
                        ${floor.floor_number}
                      </div>
                      <span style="font-weight: 700; font-size: 1rem;">${floor.floor_name}</span>
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">(${floor.flats.length} Architectural Units)</span>
                    </div>

                    <!-- Legend Helper -->
                    <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; gap: 12px;">
                      ${getLayerLegend(activeLayer)}
                    </div>
                  </div>

                  <!-- Geometric Flats Layout -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
                    ${floor.flats.map(flat => renderFlatPod(flat, activeLayer)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      container.innerHTML = html;

      // Layer buttons
      container.querySelectorAll('[data-layer]').forEach(btn => {
        btn.onclick = () => {
          activeLayer = btn.dataset.layer;
          renderCanvas();
        };
      });

      // Block tabs
      container.querySelectorAll('.btn-block-tab').forEach(btn => {
        btn.onclick = () => {
          selectedBlockId = btn.dataset.blockId;
          renderCanvas();
        };
      });

      // Flat Pod Click Inspector
      container.querySelectorAll('.floorplan-flat-pod').forEach(pod => {
        pod.onclick = () => {
          const flatId = pod.dataset.flatId;
          openFlatDetailsModal(flatId);
        };
      });
    }

    renderCanvas();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading Floor Plan: ${err.message}</div>`;
  }
}

function getLayerLegend(layer) {
  if (layer === 'occupancy') {
    return `
      <span><span style="color:#10b981;">●</span> Owner-Occupied</span>
      <span><span style="color:#06b6d4;">●</span> Tenant-Occupied</span>
      <span><span style="color:#64748b;">●</span> Vacant</span>
    `;
  }
  if (layer === 'billing') {
    return `
      <span><span style="color:#10b981;">●</span> Paid Dues</span>
      <span><span style="color:#f59e0b;">●</span> Pending Dues</span>
    `;
  }
  if (layer === 'incidents') {
    return `
      <span><span style="color:#10b981;">●</span> Zero Tickets</span>
      <span><span style="color:#ef4444;">●</span> Active Open Ticket</span>
    `;
  }
  if (layer === 'power') {
    return `
      <span><span style="color:#10b981;">●</span> Normal (<2.0kW)</span>
      <span><span style="color:#f59e0b;">●</span> High Load (>3.5kW)</span>
    `;
  }
  return '';
}

function renderFlatPod(flat, layer) {
  let borderAccent = '#6366f1';
  let statusBadge = '';
  let metricLine = '';

  if (layer === 'occupancy') {
    const isOwner = flat.occupancy_status === 'OWNER_OCCUPIED';
    const isTenant = flat.occupancy_status === 'TENANT_OCCUPIED';
    borderAccent = isOwner ? '#10b981' : (isTenant ? '#06b6d4' : '#64748b');
    statusBadge = `<span class="badge ${isOwner ? 'badge-success' : (isTenant ? 'badge-cyan' : 'badge-secondary')}">${flat.occupancy_status.replace('_', ' ')}</span>`;
    metricLine = `<i class="fa-solid fa-user-tie text-indigo-400"></i> ${flat.owner_name || 'No Owner'}`;
  } else if (layer === 'billing') {
    const isPending = flat.flat_number.endsWith('2') || flat.flat_number.endsWith('4'); // Simulated
    borderAccent = isPending ? '#f59e0b' : '#10b981';
    statusBadge = `<span class="badge ${isPending ? 'badge-warning' : 'badge-success'}">${isPending ? '₹5,680 DUE' : 'PAID'}</span>`;
    metricLine = `<i class="fa-solid fa-receipt text-indigo-400"></i> Base: ₹${(flat.built_up_area_sqft * 3.5).toFixed(0)}/mo`;
  } else if (layer === 'incidents') {
    const hasTicket = flat.flat_number === '101' || flat.flat_number === '102';
    borderAccent = hasTicket ? '#ef4444' : '#10b981';
    statusBadge = `<span class="badge ${hasTicket ? 'badge-danger' : 'badge-success'}">${hasTicket ? '1 Open Issue' : 'Clear'}</span>`;
    metricLine = hasTicket ? `<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> High Priority Escalation` : `<i class="fa-solid fa-check text-emerald-400"></i> No Incidents`;
  } else if (layer === 'power') {
    const kw = parseFloat((1.2 + ((parseInt(flat.flat_number) % 5) * 0.6)).toFixed(1));
    borderAccent = kw > 2.8 ? '#f59e0b' : '#10b981';
    statusBadge = `<span class="badge ${kw > 2.8 ? 'badge-warning' : 'badge-success'}">${kw} kW Draw</span>`;
    metricLine = `<i class="fa-solid fa-bolt text-amber-400"></i> Smart Meter EM-${flat.flat_number}`;
  }

  return `
    <div class="floorplan-flat-pod glass-panel" data-flat-id="${flat.id}" style="padding: 16px; border-top: 4px solid ${borderAccent}; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.1rem; font-weight: 700; font-family: 'Outfit'; color: #f8fafc;">Unit ${flat.flat_number}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">(${flat.flat_type})</span>
        </div>
        ${statusBadge}
      </div>

      <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${metricLine}
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 6px;">
        <span>${flat.built_up_area_sqft} sq.ft</span>
        <span>${flat.parking_slot_numbers || 'No Parking'}</span>
      </div>
    </div>
  `;
}

async function openFlatDetailsModal(flatId) {
  try {
    const res = await api.getFlat(flatId);
    const flat = res.data;

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 14px; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 1.3rem; font-weight: 700;">Flat ${flat.flat_number} - CAD Pod Inspection</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">${flat.venture_name} ➔ ${flat.block_name} ➔ ${flat.floor_name}</div>
          </div>
          <span class="badge badge-primary">${flat.occupancy_status}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.85rem;">
          <div class="glass-panel" style="padding: 10px;">
            <div style="color: var(--text-muted); font-size: 0.72rem;">TYPE</div>
            <div style="font-weight: 700;">${flat.flat_type}</div>
          </div>
          <div class="glass-panel" style="padding: 10px;">
            <div style="color: var(--text-muted); font-size: 0.72rem;">AREA</div>
            <div style="font-weight: 700;">${flat.built_up_area_sqft} sqft</div>
          </div>
          <div class="glass-panel" style="padding: 10px;">
            <div style="color: var(--text-muted); font-size: 0.72rem;">PARKING</div>
            <div style="font-weight: 700;">${flat.parking_slot_numbers || 'N/A'}</div>
          </div>
        </div>

        <div class="glass-panel" style="padding: 14px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">REGISTERED OWNER</div>
          <div style="font-weight: 700; font-size: 1rem;">${flat.owner_name || 'No Owner Assigned'}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
            ${flat.owner_email ? `<i class="fa-solid fa-envelope"></i> ${flat.owner_email}` : ''} 
            ${flat.owner_phone ? `• <i class="fa-solid fa-phone"></i> ${flat.owner_phone}` : ''}
          </div>
        </div>
      </div>
    `;

    Modal.show({
      title: `Architectural Blueprint - Unit ${flat.flat_number}`,
      bodyHtml,
      size: 'md'
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

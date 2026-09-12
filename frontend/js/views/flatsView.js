import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderFlatsView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading units...</div>`;

  try {
    const res = await api.getFlats({ venture_id: activeVentureId });
    const flats = res.data;

    const html = `
      <div class="flats-view animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 1.3rem;">Flats & Unit Inventory</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Showing ${flats.length} flats across blocks and floors in current venture scope.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary btn-sm" id="btn-assign-ownership">
              <i class="fa-solid fa-link"></i> Assign Flat Deed
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Unit / Flat</th>
                <th>Block & Floor</th>
                <th>Configuration</th>
                <th>Built-Up Area</th>
                <th>Parking Bay</th>
                <th>Occupancy</th>
                <th>Owner Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${flats.map(flat => `
                <tr>
                  <td>
                    <strong style="color: #f8fafc; font-size: 0.95rem;">Flat ${flat.flat_number}</strong>
                  </td>
                  <td>
                    <span style="color: #818cf8; font-weight: 500;">${flat.block_name}</span>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${flat.floor_name}</div>
                  </td>
                  <td>
                    <span class="badge badge-purple">${flat.flat_type}</span>
                  </td>
                  <td>${flat.built_up_area_sqft} sq.ft</td>
                  <td><code>${flat.parking_slot_numbers || 'None'}</code></td>
                  <td>
                    <span class="badge ${flat.occupancy_status === 'OWNER_OCCUPIED' ? 'badge-success' : (flat.occupancy_status === 'TENANT_OCCUPIED' ? 'badge-cyan' : 'badge-danger')}">
                      ${flat.occupancy_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    ${flat.owner_name 
                      ? `<div style="font-weight: 600;">${flat.owner_name}</div><div style="font-size: 0.72rem; color: var(--text-muted);">${flat.owner_phone || ''}</div>`
                      : `<em style="color: var(--text-muted);">Unassigned</em>`}
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" data-edit-flat="${flat.id}">
                      Inspect
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach inspect
    container.querySelectorAll('[data-edit-flat]').forEach(btn => {
      btn.onclick = () => {
        const flatId = btn.dataset.editFlat;
        window.app.navigateTo('hierarchy', null, flatId);
      };
    });

    // Assign ownership modal
    document.getElementById('btn-assign-ownership').onclick = () => openAssignDeedModal(flats);

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading flats: ${err.message}</div>`;
  }
}

async function openAssignDeedModal(flats) {
  let owners = [];
  try {
    const res = await api.getOwners();
    owners = res.data;
  } catch (e) {
    owners = [];
  }

  const bodyHtml = `
    <form id="assign-deed-form" style="display: flex; flex-direction: column; gap: 14px;">
      <div class="form-group">
        <label class="form-label">Select Target Flat</label>
        <select class="form-select" id="assign-flat-id" required>
          ${flats.map(f => `
            <option value="${f.id}">Flat ${f.flat_number} (${f.block_name} - ${f.floor_name})</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Select Registered Owner</label>
        <select class="form-select" id="assign-owner-id" required>
          ${owners.map(o => `
            <option value="${o.id}">${o.full_name} (${o.email})</option>
          `).join('')}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Title Deed Reference Number</label>
          <input type="text" class="form-input" id="assign-deed-num" placeholder="e.g. DEED-DHAR-2026-99" required />
        </div>
        <div class="form-group">
          <label class="form-label">Share %</label>
          <input type="number" class="form-input" id="assign-pct" value="100" min="1" max="100" required />
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
        <i class="fa-solid fa-stamp"></i> Execute Ownership Transfer
      </button>
    </form>
  `;

  Modal.show({
    title: 'Assign Flat Ownership Deed',
    bodyHtml,
    size: 'md'
  });

  const form = document.getElementById('assign-deed-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const flatId = document.getElementById('assign-flat-id').value;
    const ownerId = document.getElementById('assign-owner-id').value;
    const deed = document.getElementById('assign-deed-num').value;
    const pct = parseFloat(document.getElementById('assign-pct').value);

    try {
      await api.assignFlatOwnership(flatId, ownerId, deed, pct);
      Modal.hide();
      showToast('Ownership deed registered successfully!', 'success');
      renderFlatsView(document.getElementById('view-container'));
    } catch (err) {
      showToast(`Transfer failed: ${err.message}`, 'error');
    }
  };
}

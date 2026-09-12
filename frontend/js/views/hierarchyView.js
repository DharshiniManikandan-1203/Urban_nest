import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { openAddVentureModal } from '../components/ventureModal.js';

export async function renderHierarchyView(container, forcedVentureId = null) {
  const activeVentureId = forcedVentureId || state.getState().activeVentureId || 'ven-dharshini-a';
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading property hierarchy...</div>`;

  try {
    const res = await api.getVentureHierarchy(activeVentureId);
    const venture = res.data;

    let totalFlats = 0;
    let occupiedFlats = 0;
    if (venture.blocks && Array.isArray(venture.blocks)) {
      venture.blocks.forEach(b => {
        if (b.floors && Array.isArray(b.floors)) {
          b.floors.forEach(fl => {
            if (fl.flats && Array.isArray(fl.flats)) {
              fl.flats.forEach(flat => {
                totalFlats++;
                if (flat.occupancy_status !== 'VACANT') occupiedFlats++;
              });
            }
          });
        }
      });
    }

    const html = `
      <div class="hierarchy-view animate-fade">
        <!-- Venture Hero Banner -->
        <div class="venture-hero-card">
          <div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="venture-hero-title">${venture.name}</div>
              <span class="badge ${venture.code === 'DHAR-A' ? 'badge-primary' : (venture.code === 'DHAR-B' ? 'badge-cyan' : 'badge-purple')}">${venture.code}</span>
            </div>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">
              <i class="fa-solid fa-location-dot text-indigo-400"></i> ${venture.address}, ${venture.city}, ${venture.state} - ${venture.pincode}
            </p>
            <div class="venture-meta-tags">
              <span class="badge badge-purple"><i class="fa-solid fa-cubes"></i> ${venture.blocks ? venture.blocks.length : 0} Blocks</span>
              <span class="badge badge-success"><i class="fa-solid fa-door-open"></i> ${totalFlats} Flats (${occupiedFlats} Occupied)</span>
              <span class="badge badge-cyan"><i class="fa-solid fa-dumbbell"></i> ${venture.amenities ? venture.amenities.length : 0} Amenities Active</span>
            </div>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
            <div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">MAINTENANCE BASE RATE</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: #34d399;">₹${venture.maintenance_rate}<span style="font-size: 0.85rem; color: var(--text-secondary);">/sq.ft/mo</span></div>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-hierarchy-add-venture">
              <i class="fa-solid fa-plus"></i> Add New Venture
            </button>
          </div>
        </div>

        <!-- Blocks Tree or Empty State -->
        ${(!venture.blocks || venture.blocks.length === 0) ? `
          <div class="glass-panel text-center" style="padding: 48px 24px; margin-top: 24px;">
            <div style="font-size: 3rem; color: #6366f1; margin-bottom: 16px;">
              <i class="fa-solid fa-cubes-stacked"></i>
            </div>
            <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No Blocks Configured Yet</h3>
            <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 20px; font-size: 0.9rem;">
              This venture has been registered successfully. You can begin segregating towers, blocks, floors, and unit configurations.
            </p>
            <button class="btn btn-primary" id="btn-hierarchy-empty-add-block">
              <i class="fa-solid fa-plus"></i> Add First Block to ${venture.name}
            </button>
          </div>
        ` : `
          <div class="hierarchy-tree">
            ${venture.blocks.map(block => `
              <div class="block-card">
                <div class="block-header">
                  <div class="block-title">
                    <i class="fa-solid fa-building text-indigo-400"></i>
                    <span>${block.name}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">(${block.code})</span>
                  </div>
                  <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="badge badge-primary">${block.floors ? block.floors.length : 0} Floors</span>
                    <span class="badge badge-success">${block.floors ? block.floors.reduce((acc, f) => acc + (f.flats ? f.flats.length : 0), 0) : 0} Flats</span>
                  </div>
                </div>

                <div class="block-body">
                  ${(block.floors || []).map(floor => `
                    <div class="floor-row">
                      <div class="floor-label-box">
                        <div class="floor-name">${floor.floor_name}</div>
                        <div class="floor-sub">${floor.flats ? floor.flats.length : 0} Units on Floor</div>
                      </div>

                      <div class="flats-grid">
                        ${(floor.flats || []).map(flat => `
                          <div class="flat-unit-card status-${flat.occupancy_status}" data-flat-id="${flat.id}">
                            <div class="flat-unit-top">
                              <span class="flat-number-text">Unit ${flat.flat_number}</span>
                              <span class="flat-type-tag">${flat.flat_type}</span>
                            </div>
                            <div class="flat-owner-line" title="${flat.owner_name ? `Owner: ${flat.owner_name}` : 'Vacant Property'}">
                              <i class="fa-solid fa-user-tie ${flat.owner_name ? 'text-indigo-400' : 'text-slate-500'}"></i>
                              <span>${flat.owner_name || '<em style="color: var(--text-muted);">No Owner Assigned</em>'}</span>
                            </div>
                            <div class="flat-specs-line">
                              <span>${flat.built_up_area_sqft} sq.ft</span> • 
                              <span>${flat.parking_slot_numbers || 'No Parking'}</span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;

    const addVentureBtn = container.querySelector('#btn-hierarchy-add-venture');
    if (addVentureBtn) {
      addVentureBtn.onclick = () => openAddVentureModal();
    }

    const emptyAddBlockBtn = container.querySelector('#btn-hierarchy-empty-add-block');
    if (emptyAddBlockBtn) {
      emptyAddBlockBtn.onclick = async () => {
        try {
          const bRes = await api.request('/blocks', {
            method: 'POST',
            body: JSON.stringify({
              venture_id: venture.id,
              name: 'Block A (Main Tower)',
              code: 'BLK-A',
              total_floors: 2,
              description: 'Primary residential block'
            })
          });
          // Add 2 floors
          const fl1 = await api.request('/floors', {
            method: 'POST',
            body: JSON.stringify({ block_id: bRes.blockId, floor_number: 1, floor_name: 'Floor 1', total_flats: 4 })
          });
          const fl2 = await api.request('/floors', {
            method: 'POST',
            body: JSON.stringify({ block_id: bRes.blockId, floor_number: 2, floor_name: 'Floor 2', total_flats: 4 })
          });
          // Add sample flats
          await api.request('/flats', {
            method: 'POST',
            body: JSON.stringify({ floor_id: fl1.floorId, flat_number: '101', flat_type: '3BHK', built_up_area_sqft: 1650, carpet_area_sqft: 1280, parking_slot_numbers: 'P-101' })
          });
          await api.request('/flats', {
            method: 'POST',
            body: JSON.stringify({ floor_id: fl1.floorId, flat_number: '102', flat_type: '2BHK', built_up_area_sqft: 1250, carpet_area_sqft: 980, parking_slot_numbers: 'P-102' })
          });
          await api.request('/flats', {
            method: 'POST',
            body: JSON.stringify({ floor_id: fl2.floorId, flat_number: '201', flat_type: '3BHK', built_up_area_sqft: 1650, carpet_area_sqft: 1280, parking_slot_numbers: 'P-201' })
          });
          showToast(`Default Block & Units added to ${venture.name}!`, 'success');
          renderHierarchyView(container, venture.id);
        } catch (err) {
          showToast(`Error adding block: ${err.message}`, 'error');
        }
      };
    }

    // Attach click event to flat cards
    container.querySelectorAll('.flat-unit-card').forEach(card => {
      card.onclick = async () => {
        const flatId = card.dataset.flatId;
        await openFlatInspectorModal(flatId);
      };
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading hierarchy: ${err.message}</div>`;
  }
}

async function openFlatInspectorModal(flatId) {
  try {
    const res = await api.getFlat(flatId);
    const flat = res.data;

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 16px; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 1.4rem; font-weight: 700; font-family: 'Outfit';">Flat ${flat.flat_number}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${flat.venture_name} ➔ ${flat.block_name} ➔ ${flat.floor_name}</div>
          </div>
          <span class="badge ${flat.occupancy_status === 'OWNER_OCCUPIED' ? 'badge-success' : (flat.occupancy_status === 'TENANT_OCCUPIED' ? 'badge-cyan' : 'badge-danger')}">
            ${flat.occupancy_status.replace('_', ' ')}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 0.85rem;">
          <div class="glass-panel" style="padding: 12px;">
            <div style="color: var(--text-muted); font-size: 0.75rem;">CONFIGURATION</div>
            <div style="font-weight: 700; color: #f8fafc; margin-top: 2px;">${flat.flat_type}</div>
          </div>
          <div class="glass-panel" style="padding: 12px;">
            <div style="color: var(--text-muted); font-size: 0.75rem;">BUILT-UP AREA</div>
            <div style="font-weight: 700; color: #f8fafc; margin-top: 2px;">${flat.built_up_area_sqft} sq.ft</div>
          </div>
          <div class="glass-panel" style="padding: 12px;">
            <div style="color: var(--text-muted); font-size: 0.75rem;">PARKING BAY</div>
            <div style="font-weight: 700; color: #f8fafc; margin-top: 2px;">${flat.parking_slot_numbers || 'None'}</div>
          </div>
        </div>

        <!-- Owner Details Section -->
        <div class="glass-panel" style="padding: 16px;">
          <h4 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--brand-primary-light);">
            <i class="fa-solid fa-id-badge"></i> Registered Owner Information
          </h4>
          ${flat.owner_name ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; font-size: 1rem;">${flat.owner_name}</div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                  <i class="fa-solid fa-envelope"></i> ${flat.owner_email || 'N/A'} • <i class="fa-solid fa-phone"></i> ${flat.owner_phone || 'N/A'}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                  Title Deed Ref: <strong>${flat.deed_reference_number || 'DEED-REGISTERED'}</strong>
                </div>
              </div>
              <span class="badge badge-success">${flat.ownership_percentage || 100}% Title</span>
            </div>
          ` : `
            <div style="color: var(--text-muted); font-size: 0.85rem;">No owner assigned to this flat deed yet.</div>
          `}
        </div>

        <!-- Monthly Maintenance Calc -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 16px; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Calculated Monthly Maintenance (Base: ₹${flat.maintenance_rate}/sqft)</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #34d399;">₹${(flat.built_up_area_sqft * flat.maintenance_rate).toFixed(2)} / month</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.navigateTo('maintenance')">View Ledger</button>
        </div>

        <!-- Occupancy Quick Updater -->
        <div>
          <label class="form-label">Update Unit Occupancy Status:</label>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="btn-set-owner">Set Owner-Occupied</button>
            <button class="btn btn-secondary btn-sm" id="btn-set-tenant">Set Tenant-Occupied</button>
            <button class="btn btn-secondary btn-sm" id="btn-set-vacant">Set Vacant</button>
          </div>
        </div>
      </div>
    `;

    Modal.show({
      title: `Flat ${flat.flat_number} - Inspection`,
      bodyHtml,
      size: 'md'
    });

    const updateStatus = async (newStatus) => {
      try {
        await api.updateFlatStatus(flat.id, newStatus);
        showToast(`Flat ${flat.flat_number} updated to ${newStatus}`, 'success');
        Modal.hide();
        renderHierarchyView(document.getElementById('view-container'));
      } catch (e) {
        showToast(`Error updating flat: ${e.message}`, 'error');
      }
    };

    document.getElementById('btn-set-owner').onclick = () => updateStatus('OWNER_OCCUPIED');
    document.getElementById('btn-set-tenant').onclick = () => updateStatus('TENANT_OCCUPIED');
    document.getElementById('btn-set-vacant').onclick = () => updateStatus('VACANT');

  } catch (err) {
    showToast(`Failed to inspect flat: ${err.message}`, 'error');
  }
}

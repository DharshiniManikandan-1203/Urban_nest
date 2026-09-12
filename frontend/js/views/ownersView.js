import { api } from '../api.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderOwnersView(container) {
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading owner records...</div>`;

  try {
    const res = await api.getOwners();
    const owners = res.data;

    const html = `
      <div class="owners-view animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.3rem;">Unique Owners & Portfolios</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Owner identities are segregated from flat physical assets and support multi-property holdings across ventures.
            </p>
          </div>
          <button class="btn btn-primary" id="btn-add-owner">
            <i class="fa-solid fa-user-plus"></i> Register New Owner
          </button>
        </div>

        <div class="owner-cards-grid">
          ${owners.map(owner => `
            <div class="owner-card">
              <div class="owner-header">
                <div class="owner-avatar-lg">
                  ${owner.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h3 style="font-size: 1.1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${owner.full_name}
                  </h3>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-envelope"></i> ${owner.email}
                  </div>
                </div>
                <span class="badge badge-primary">
                  ${owner.total_properties} ${owner.total_properties === 1 ? 'Flat' : 'Flats'}
                </span>
              </div>

              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--text-muted);">Phone:</span>
                  <span style="color: var(--text-primary); font-weight: 600;">${owner.phone}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--text-muted);">KYC Document:</span>
                  <span style="color: var(--text-primary);">${owner.national_id_type || 'AADHAAR'} (${owner.national_id_number || 'VERIFIED'})</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Holdings Across:</span>
                  <span style="color: #38bdf8; font-weight: 600;">${owner.venture_names || 'None'}</span>
                </div>
              </div>

              <button class="btn btn-secondary btn-sm" style="width: 100%;" data-view-portfolio="${owner.id}">
                <i class="fa-solid fa-folder-open"></i> Inspect Property Deeds
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach portfolio view handler
    container.querySelectorAll('[data-view-portfolio]').forEach(btn => {
      btn.onclick = async () => {
        const ownerId = btn.dataset.viewPortfolio;
        await openOwnerPortfolioModal(ownerId);
      };
    });

    // Add owner handler
    document.getElementById('btn-add-owner').onclick = () => openAddOwnerModal();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading owners: ${err.message}</div>`;
  }
}

async function openOwnerPortfolioModal(ownerId) {
  try {
    const res = await api.getOwnerPortfolio(ownerId);
    const owner = res.data;

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; align-items: center; gap: 16px; background: rgba(0,0,0,0.25); padding: 16px; border-radius: var(--radius-sm);">
          <div class="owner-avatar-lg" style="width: 56px; height: 56px; font-size: 1.4rem;">
            ${owner.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div>
            <div style="font-size: 1.3rem; font-weight: 700;">${owner.full_name}</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              ${owner.email} • ${owner.phone}
            </div>
            <div style="font-size: 0.78rem; color: #34d399; margin-top: 2px;">
              <i class="fa-solid fa-shield-check"></i> Verified Owner Profile • ${owner.ownedFlats?.length || 0} Deed(s) Attached
            </div>
          </div>
        </div>

        <h4 style="font-size: 1rem; color: var(--brand-primary-light);">
          <i class="fa-solid fa-building-circle-check"></i> Real Estate Portfolio Holdings
        </h4>

        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 320px; overflow-y: auto;">
          ${(owner.ownedFlats && owner.ownedFlats.length > 0) ? owner.ownedFlats.map(flat => `
            <div class="glass-panel" style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <div style="font-weight: 700; font-size: 1.1rem; color: #f8fafc;">
                    Flat ${flat.flat_number} (${flat.flat_type})
                  </div>
                  <div style="font-size: 0.82rem; color: #818cf8; font-weight: 600;">
                    ${flat.venture_name} (${flat.code}) ➔ ${flat.block_name} ➔ ${flat.floor_name}
                  </div>
                </div>
                <span class="badge badge-success">${flat.ownership_percentage}% Ownership</span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 0.78rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px;">
                <div>Built-Up: <strong style="color: #f8fafc;">${flat.built_up_area_sqft} sqft</strong></div>
                <div>Status: <strong style="color: #34d399;">${flat.occupancy_status}</strong></div>
                <div>Parking: <strong style="color: #f8fafc;">${flat.parking_slot_numbers || 'P-None'}</strong></div>
              </div>

              <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
                <span>Title Deed: <code>${flat.deed_reference_number || 'DEED-CONFIRMED'}</code></span>
                <span>Address: ${flat.venture_address}</span>
              </div>
            </div>
          `).join('') : `
            <div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">
              No properties linked to this owner profile.
            </div>
          `}
        </div>
      </div>
    `;

    Modal.show({
      title: `${owner.full_name} - Portfolio Deed Details`,
      bodyHtml,
      size: 'lg'
    });

  } catch (err) {
    showToast(`Failed to load portfolio: ${err.message}`, 'error');
  }
}

function openAddOwnerModal() {
  const bodyHtml = `
    <form id="add-owner-form" style="display: flex; flex-direction: column; gap: 14px;">
      <div class="form-group">
        <label class="form-label">Full Legal Name</label>
        <input type="text" class="form-input" id="owner-name" placeholder="e.g. Suresh Kumar" required />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-input" id="owner-email" placeholder="suresh@example.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-input" id="owner-phone" placeholder="+91 98765 00000" required />
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">ID Document Type</label>
          <select class="form-select" id="owner-id-type">
            <option value="AADHAAR">Aadhaar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="PASSPORT">Passport</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ID Number / Reference</label>
          <input type="text" class="form-input" id="owner-id-num" placeholder="XXXX-XXXX-1234" />
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
        <i class="fa-solid fa-check"></i> Register Owner & Save KYC
      </button>
    </form>
  `;

  Modal.show({
    title: 'Register New Property Owner',
    bodyHtml,
    size: 'md'
  });

  const form = document.getElementById('add-owner-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('owner-name').value;
    const email = document.getElementById('owner-email').value;
    const phone = document.getElementById('owner-phone').value;
    const idType = document.getElementById('owner-id-type').value;
    const idNum = document.getElementById('owner-id-num').value;

    try {
      await api.createOwner({
        full_name: fullName,
        email,
        phone,
        national_id_type: idType,
        national_id_number: idNum
      });

      Modal.hide();
      showToast(`Owner ${fullName} registered successfully!`, 'success');
      renderOwnersView(document.getElementById('view-container'));
    } catch (err) {
      showToast(`Registration failed: ${err.message}`, 'error');
    }
  };
}

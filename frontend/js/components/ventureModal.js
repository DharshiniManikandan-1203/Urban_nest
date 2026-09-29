import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from './modal.js';
import { showToast } from './toast.js';

export function openAddVentureModal() {
  const bodyHtml = `
    <form id="create-venture-form" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 12px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
        <i class="fa-solid fa-circle-info text-indigo-400"></i> Add a new apartment community or gated venture to the Urban Nest multi-venture management network.
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Venture Name *</label>
          <input type="text" id="v-name" class="form-control" placeholder="e.g. Dharshini C - Sky Villas" required />
        </div>
        <div class="form-group">
          <label class="form-label">Venture Code *</label>
          <input type="text" id="v-code" class="form-control" placeholder="e.g. DHAR-C" style="text-transform: uppercase;" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Street Address *</label>
        <input type="text" id="v-address" class="form-control" placeholder="e.g. Survey 88, Financial District, Nanakramguda" required />
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">City *</label>
          <input type="text" id="v-city" class="form-control" value="Hyderabad" required />
        </div>
        <div class="form-group">
          <label class="form-label">State *</label>
          <input type="text" id="v-state" class="form-control" value="Telangana" required />
        </div>
        <div class="form-group">
          <label class="form-label">Pincode *</label>
          <input type="text" id="v-pincode" class="form-control" placeholder="500075" required />
        </div>
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Base Maintenance Rate (₹/sq.ft/mo) *</label>
          <input type="number" id="v-rate" class="form-control" value="3.50" step="0.10" min="0.5" required />
        </div>
        <div class="form-group">
          <label class="form-label">Quick Structural Setup</label>
          <select id="v-scaffold" class="form-control">
            <option value="scaffold-2">Auto-create 2 Blocks (Block A & B, 8 flats each)</option>
            <option value="scaffold-1">Auto-create 1 Block (Block A, 4 flats)</option>
            <option value="empty">Empty Venture (Configure blocks manually)</option>
          </select>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 0 0; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); margin-top: 8px;">
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-submit-venture">
          <i class="fa-solid fa-plus"></i> Create Venture
        </button>
      </div>
    </form>
  `;

  Modal.show({
    title: '🏗️ Add New Property Venture',
    bodyHtml,
    size: 'lg'
  });

  const codeInput = document.getElementById('v-code');
  const nameInput = document.getElementById('v-name');
  if (codeInput && nameInput) {
    nameInput.addEventListener('input', (e) => {
      if (!codeInput.dataset.manuallyEdited) {
        const words = e.target.value.trim().split(/\s+/);
        if (words.length >= 2) {
          codeInput.value = (words[0].substring(0, 4) + '-' + words[1].charAt(0)).toUpperCase();
        }
      }
    });
    codeInput.addEventListener('input', () => {
      codeInput.dataset.manuallyEdited = 'true';
    });
  }

  const form = document.getElementById('create-venture-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-venture');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating...`;

      try {
        const name = document.getElementById('v-name').value.trim();
        const code = document.getElementById('v-code').value.trim().toUpperCase();
        const address = document.getElementById('v-address').value.trim();
        const city = document.getElementById('v-city').value.trim();
        const stateVal = document.getElementById('v-state').value.trim();
        const pincode = document.getElementById('v-pincode').value.trim();
        const maintenance_rate = parseFloat(document.getElementById('v-rate').value) || 3.50;
        const scaffold = document.getElementById('v-scaffold').value;

        let initial_blocks = [];
        if (scaffold === 'scaffold-2') {
          initial_blocks = [
            { name: 'Block A (East Wing)', code: 'BLK-A', total_floors: 2, description: '2-Floor Residential Tower' },
            { name: 'Block B (West Wing)', code: 'BLK-B', total_floors: 2, description: '2-Floor Residential Tower' }
          ];
        } else if (scaffold === 'scaffold-1') {
          initial_blocks = [
            { name: 'Block A (Main Tower)', code: 'BLK-A', total_floors: 1, description: 'Single Floor Residence' }
          ];
        }

        const payload = {
          name,
          code,
          address,
          city,
          state: stateVal,
          pincode,
          maintenance_rate,
          initial_blocks
        };

        const res = await api.createVenture(payload);
        showToast(`Venture "${name}" created successfully!`, 'success');
        Modal.hide();

        // Refresh ventures list in global state and select newly created venture
        const venturesRes = await api.getVentures();
        state.setState({
          ventures: venturesRes.data,
          activeVentureId: res.ventureId || res.data?.id
        });

      } catch (err) {
        showToast(`Failed to create venture: ${err.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Create Venture`;
      }
    };
  }
}

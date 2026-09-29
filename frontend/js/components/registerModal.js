import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from './modal.js';
import { showToast } from './toast.js';

export function openRegisterModal() {
  const { ventures } = state.getState();

  const bodyHtml = `
    <form id="user-registration-form" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
        <i class="fa-solid fa-user-plus text-emerald-400"></i> Register a new member account with automatic role assignment and immediate session generation.
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" id="reg-fullname" class="form-control" placeholder="e.g. Kavita Ramachandran" required />
        </div>
        <div class="form-group">
          <label class="form-label">Email Address *</label>
          <input type="email" id="reg-email" class="form-control" placeholder="e.g. kavita.r@example.com" required />
        </div>
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Password *</label>
          <input type="password" id="reg-password" class="form-control" placeholder="Min. 6 characters" required />
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" id="reg-phone" class="form-control" placeholder="+91 98765 00000" />
        </div>
      </div>

      <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Account Role *</label>
          <select id="reg-role" class="form-control" required>
            <option value="OWNER" selected>🔑 Flat Owner (Asset deed & amenities)</option>
            <option value="RESIDENT">🏡 Resident Tenant (Amenities & tickets)</option>
            <option value="VENTURE_ADMIN">🏢 Venture Admin (Community Manager)</option>
            <option value="BLOCK_MANAGER">🧱 Block Manager</option>
            <option value="FLOOR_MANAGER">📶 Floor Manager</option>
            <option value="SUPER_ADMIN">👑 Super Admin (Full God-mode)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Associated Venture</label>
          <select id="reg-venture" class="form-control">
            ${ventures.map(v => `<option value="${v.id}">${v.name} (${v.code})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 0 0; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-subtle); margin-top: 8px;">
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-submit-register">
          <i class="fa-solid fa-user-check"></i> Register Account
        </button>
      </div>
    </form>
  `;

  Modal.show({
    title: '👤 Register New User Account',
    bodyHtml,
    size: 'lg'
  });

  const form = document.getElementById('user-registration-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-register');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registering...`;

      try {
        const full_name = document.getElementById('reg-fullname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const phone = document.getElementById('reg-phone').value.trim();
        const role = document.getElementById('reg-role').value;
        const venture_id = document.getElementById('reg-venture').value;

        const res = await api.register({
          full_name,
          email,
          password,
          phone,
          role,
          venture_id
        });

        api.setToken(res.token);
        state.setState({
          currentUser: res.user,
          activeRole: res.user.activeRole,
          activeVentureId: res.user.activeVentureId || venture_id
        });

        showToast(`Account created! Logged in as ${res.user.full_name} (${res.user.activeRole})`, 'success');
        Modal.hide();

      } catch (err) {
        showToast(`Registration failed: ${err.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-user-check"></i> Register Account`;
      }
    };
  }
}

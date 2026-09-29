import { state } from '../state.js';
import { api } from '../api.js';
import { showToast } from './toast.js';

export const DEMO_PERSONAS = [
  {
    id: 'super-admin',
    name: '👑 Super Admin',
    email: 'superadmin@urbannest.com',
    role: 'SUPER_ADMIN',
    ventureId: 'ven-dharshini-a',
    desc: 'Manages both Dharshini A & Dharshini B'
  },
  {
    id: 'admin-a',
    name: '🏢 Venture Admin (Dharshini A)',
    email: 'admin.a@urbannest.com',
    role: 'VENTURE_ADMIN',
    ventureId: 'ven-dharshini-a',
    desc: 'Scoped to Dharshini A (Full Amenities)'
  },
  {
    id: 'admin-b',
    name: '🏡 Venture Admin (Dharshini B)',
    email: 'admin.b@urbannest.com',
    role: 'VENTURE_ADMIN',
    ventureId: 'ven-dharshini-b',
    desc: 'Scoped to Dharshini B (Pool Only)'
  },
  {
    id: 'block-mgr',
    name: '🧱 Block Manager',
    email: 'blockmgr.a@urbannest.com',
    role: 'BLOCK_MANAGER',
    ventureId: 'ven-dharshini-a',
    blockId: 'blk-dhara-a',
    desc: 'Block A (Tower 1)'
  },
  {
    id: 'floor-mgr',
    name: '📶 Floor Manager',
    email: 'floormgr.a1@urbannest.com',
    role: 'FLOOR_MANAGER',
    ventureId: 'ven-dharshini-a',
    blockId: 'blk-dhara-a',
    floorId: 'fl-blk-dhara-a-1',
    desc: '1st Floor Manager'
  },
  {
    id: 'owner-rajesh',
    name: '🔑 Rajesh (Multi-Property Owner)',
    email: 'owner.rajesh@urbannest.com',
    role: 'OWNER',
    ventureId: 'ven-dharshini-a',
    desc: 'Owns Flat 101 in Dharshini A & Flat 101 in Dharshini B'
  },
  {
    id: 'owner-priya',
    name: '🔑 Priya (Flat 102 Owner)',
    email: 'owner.priya@urbannest.com',
    role: 'OWNER',
    ventureId: 'ven-dharshini-a',
    desc: 'Flat 102 in Dharshini A'
  }
];

export function renderRoleSwitcher(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentRole = state.getState().activeRole;
  const currentEmail = state.getState().currentUser?.email;

  container.innerHTML = `
    <div class="persona-label">
      <i class="fa-solid fa-masks-theater text-indigo-400"></i>
      <span>Test Persona Switcher:</span>
    </div>
    <div class="persona-chips">
      ${DEMO_PERSONAS.map(p => `
        <button class="persona-chip ${currentEmail === p.email ? 'active' : ''}" data-email="${p.email}">
          ${p.name}
        </button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.persona-chip').forEach(btn => {
    btn.onclick = async () => {
      const email = btn.dataset.email;
      const persona = DEMO_PERSONAS.find(p => p.email === email);
      if (!persona) return;

      try {
        const res = await api.login(persona.email, 'Password@123');
        api.setToken(res.token);

        state.setState({
          currentUser: res.user,
          activeRole: res.user.activeRole,
          activeVentureId: res.user.activeVentureId || 'ven-dharshini-a'
        });

        showToast(`Switched persona to ${persona.name}`, 'success');
      } catch (err) {
        showToast(`Failed to switch persona: ${err.message}`, 'error');
      }
    };
  });
}

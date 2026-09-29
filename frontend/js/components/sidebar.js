import { state } from '../state.js';

export function renderSidebar(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { currentUser, activeRole, currentTab } = state.getState();

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: 'fa-solid fa-chart-pie', section: 'Overview' },
    { id: 'hierarchy', label: 'Property Hierarchy', icon: 'fa-solid fa-sitemap', section: 'Overview' },
    { id: 'floorplan', label: '2D Floor Plan Map', icon: 'fa-solid fa-layer-group', section: 'Overview' },

    { id: 'visitors', label: 'Gate & Visitors Kiosk', icon: 'fa-solid fa-id-card-clip', section: 'Security & Access' },
    { id: 'bookings', label: 'Amenity QR Passes', icon: 'fa-solid fa-ticket', section: 'Security & Access' },

    { id: 'utilities', label: 'Smart Sub-Meters', icon: 'fa-solid fa-bolt-lightning', section: 'IoT & Telemetry' },
    { id: 'iot', label: 'SCADA & IoT Sensors', icon: 'fa-solid fa-tower-broadcast', section: 'IoT & Telemetry' },
    { id: 'maintenance', label: 'Maintenance Bills', icon: 'fa-solid fa-receipt', section: 'Operations' },
    { id: 'tickets', label: 'SLA Escalation Desk', icon: 'fa-solid fa-triangle-exclamation', section: 'Operations' },

    { id: 'owners', label: 'Unique Owners', icon: 'fa-solid fa-id-card', section: 'Asset Registry' },
    { id: 'flats', label: 'Flats & Units', icon: 'fa-solid fa-door-open', section: 'Asset Registry' },
    { id: 'amenities', label: 'Amenities Engine', icon: 'fa-solid fa-dumbbell', section: 'Asset Registry' },
    { id: 'audit', label: 'Audit Trail Ledger', icon: 'fa-solid fa-file-shield', section: 'Compliance' }
  ];

  // Group by sections
  const sections = {};
  navItems.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  let navHtml = '';
  for (const [secTitle, items] of Object.entries(sections)) {
    navHtml += `<div class="nav-section-title">${secTitle}</div>`;
    for (const it of items) {
      navHtml += `
        <div class="nav-item ${currentTab === it.id ? 'active' : ''}" data-tab="${it.id}">
          <i class="${it.icon}"></i>
          <span>${it.label}</span>
        </div>
      `;
    }
  }

  const initials = currentUser?.full_name 
    ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'UN';

  container.innerHTML = `
    <div class="sidebar-header">
      <div class="brand-logo-box">
        <i class="fa-solid fa-city"></i>
      </div>
      <div>
        <div class="brand-title">Urban Nest</div>
        <div class="brand-subtitle">PropTech OS</div>
      </div>
    </div>
    
    <div class="sidebar-nav">
      ${navHtml}
    </div>

    <div class="sidebar-footer">
      <div class="user-mini-card">
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <div class="user-name">${currentUser?.full_name || 'Dharshini Manikandan'}</div>
          <div class="user-role-tag">${activeRole}</div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
      const tabId = item.dataset.tab;
      state.setState({ currentTab: tabId });
    };
  });
}

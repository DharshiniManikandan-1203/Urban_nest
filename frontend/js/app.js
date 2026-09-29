import { state } from './state.js';
import { api } from './api.js';
import { renderRoleSwitcher } from './components/roleSwitcher.js';
import { renderHeader } from './components/header.js';
import { renderSidebar } from './components/sidebar.js';
import { showToast } from './components/toast.js';

// Views
import { renderDashboardView } from './views/dashboardView.js';
import { renderHierarchyView } from './views/hierarchyView.js';
import { renderFloorPlanView } from './views/floorPlanView.js';
import { renderVisitorView } from './views/visitorView.js';
import { renderUtilitiesView } from './views/utilitiesView.js';
import { renderIoTDashboardView } from './views/iotDashboardView.js';
import { renderAmenitiesView } from './views/amenitiesView.js';
import { renderOwnersView } from './views/ownersView.js';
import { renderFlatsView } from './views/flatsView.js';
import { renderBookingsView } from './views/bookingsView.js';
import { renderMaintenanceView } from './views/maintenanceView.js';
import { renderTicketsView } from './views/ticketsView.js';
import { renderAuditView } from './views/auditView.js';
import { realtime } from './realtime.js';

class App {
  constructor() {
    this.viewContainer = null;
  }

  async init() {
    this.viewContainer = document.getElementById('view-container');

    // 1. Initial login as Super Admin
    try {
      const loginRes = await api.login('superadmin@urbannest.com', 'Password@123');
      api.setToken(loginRes.token);

      const venturesRes = await api.getVentures();

      state.setState({
        currentUser: loginRes.user,
        activeRole: loginRes.user.activeRole || 'SUPER_ADMIN',
        activeVentureId: venturesRes.data[0]?.id || 'ven-dharshini-a',
        ventures: venturesRes.data,
        currentTab: 'dashboard'
      });

      // Initialize Real-Time SSE Stream
      realtime.init();

    } catch (err) {
      console.error('App init error:', err);
      showToast('Backend connection error. Make sure server is running.', 'error');
    }

    // 2. Subscribe to state changes
    state.subscribe((newState) => {
      this.render();
    });

    // 3. Initial render
    this.render();
  }

  render() {
    renderRoleSwitcher('role-persona-bar');
    renderSidebar('sidebar');
    renderHeader('top-header');
    this.renderCurrentView();
  }

  renderCurrentView() {
    const { currentTab } = state.getState();
    if (!this.viewContainer) return;

    switch (currentTab) {
      case 'dashboard':
        renderDashboardView(this.viewContainer);
        break;
      case 'hierarchy':
        renderHierarchyView(this.viewContainer);
        break;
      case 'floorplan':
        renderFloorPlanView(this.viewContainer);
        break;
      case 'visitors':
        renderVisitorView(this.viewContainer);
        break;
      case 'utilities':
        renderUtilitiesView(this.viewContainer);
        break;
      case 'iot':
        renderIoTDashboardView(this.viewContainer);
        break;
      case 'amenities':
        renderAmenitiesView(this.viewContainer);
        break;
      case 'owners':
        renderOwnersView(this.viewContainer);
        break;
      case 'flats':
        renderFlatsView(this.viewContainer);
        break;
      case 'bookings':
        renderBookingsView(this.viewContainer);
        break;
      case 'maintenance':
        renderMaintenanceView(this.viewContainer);
        break;
      case 'tickets':
        renderTicketsView(this.viewContainer);
        break;
      case 'audit':
        renderAuditView(this.viewContainer);
        break;
      default:
        renderDashboardView(this.viewContainer);
        break;
    }
  }

  navigateTo(tabId, ventureId = null) {
    const update = { currentTab: tabId };
    if (ventureId) {
      update.activeVentureId = ventureId;
    }
    state.setState(update);
  }
}

window.app = new App();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});

import { CONFIG } from './config.js';

class ApiService {
  constructor() {
  }

  get baseUrl() {
    return CONFIG.API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem(CONFIG.DEFAULT_TOKEN_KEY);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(CONFIG.DEFAULT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CONFIG.DEFAULT_TOKEN_KEY);
    }
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'API Request failed');
      }
      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
      throw error;
    }
  }

  // Auth
  register(payload) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  getDemoUsers() {
    return this.request('/auth/demo-users');
  }

  switchContext(role, ventureId = null, blockId = null, floorId = null) {
    return this.request('/auth/switch-context', {
      method: 'POST',
      body: JSON.stringify({ role, ventureId, blockId, floorId })
    });
  }

  // Ventures
  getVentures() {
    return this.request('/ventures');
  }

  getVenture(ventureId) {
    return this.request(`/ventures/${ventureId}`);
  }

  getVentureHierarchy(ventureId) {
    return this.request(`/ventures/${ventureId}/hierarchy`);
  }

  createVenture(payload) {
    return this.request('/ventures', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Blocks, Floors, Flats
  getBlocks(ventureId = null) {
    const q = ventureId ? `?venture_id=${ventureId}` : '';
    return this.request(`/blocks${q}`);
  }

  getFloors(blockId = null) {
    const q = blockId ? `?block_id=${blockId}` : '';
    return this.request(`/floors${q}`);
  }

  getFlats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/flats${query ? '?' + query : ''}`);
  }

  getFlat(flatId) {
    return this.request(`/flats/${flatId}`);
  }

  updateFlatStatus(flatId, occupancyStatus) {
    return this.request(`/flats/${flatId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ occupancy_status: occupancyStatus })
    });
  }

  assignFlatOwnership(flatId, ownerId, deedNumber, percentage = 100) {
    return this.request(`/flats/${flatId}/ownership`, {
      method: 'PUT',
      body: JSON.stringify({
        flat_id: flatId,
        owner_id: ownerId,
        deed_reference_number: deedNumber,
        ownership_percentage: percentage,
        is_primary_owner: true
      })
    });
  }

  // Owners
  getOwners() {
    return this.request('/owners');
  }

  getOwnerPortfolio(ownerId) {
    return this.request(`/owners/${ownerId}`);
  }

  createOwner(payload) {
    return this.request('/owners', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Amenities
  getAmenityCatalog() {
    return this.request('/amenities/catalog');
  }

  getVentureAmenities(ventureId) {
    return this.request(`/amenities/venture/${ventureId}`);
  }

  enableVentureAmenity(payload) {
    return this.request('/amenities/venture', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Bookings
  getBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/bookings${query ? '?' + query : ''}`);
  }

  createBooking(payload) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  verifyQrPass(code) {
    return this.request(`/bookings/verify-qr/${code}`);
  }

  // Maintenance
  getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/maintenance/invoices${query ? '?' + query : ''}`);
  }

  generateInvoices(ventureId, billingMonth, dueDate) {
    return this.request('/maintenance/generate', {
      method: 'POST',
      body: JSON.stringify({
        venture_id: ventureId,
        billing_month: billingMonth,
        due_date: dueDate
      })
    });
  }

  payInvoice(invoiceId, paymentMethod = 'UPI') {
    return this.request(`/maintenance/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod })
    });
  }

  // Tickets
  getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tickets${query ? '?' + query : ''}`);
  }

  createTicket(payload) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  resolveTicket(ticketId, status, resolutionNotes) {
    return this.request(`/tickets/${ticketId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        resolution_notes: resolutionNotes
      })
    });
  }

  escalateTicket(ticketId, reason) {
    return this.request(`/tickets/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Visitors & Gatekeeper
  getVisitors(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/visitors${query ? '?' + query : ''}`);
  }

  getVisitorStats(ventureId = null) {
    const q = ventureId ? `?venture_id=${ventureId}` : '';
    return this.request(`/visitors/stats${q}`);
  }

  preApproveVisitor(payload) {
    return this.request('/visitors/pre-approve', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  checkInVisitor(passCode, phone = '') {
    return this.request('/visitors/check-in', {
      method: 'POST',
      body: JSON.stringify({ pass_code: passCode, visitor_phone: phone })
    });
  }

  checkOutVisitor(visitorId) {
    return this.request('/visitors/check-out', {
      method: 'POST',
      body: JSON.stringify({ visitor_id: visitorId })
    });
  }

  // Smart Utilities
  getSmartMeters(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/utilities/meters${query ? '?' + query : ''}`);
  }

  pulseMeter(meterId, unitsAdded = 1.0) {
    return this.request('/utilities/pulse', {
      method: 'POST',
      body: JSON.stringify({ meter_id: meterId, units_added: unitsAdded })
    });
  }

  getUtilityBreakdown(flatId) {
    return this.request(`/utilities/breakdown/${flatId}`);
  }

  generateIntegratedInvoice(flatId, billingMonth = null) {
    return this.request('/utilities/generate-integrated-invoice', {
      method: 'POST',
      body: JSON.stringify({ flat_id: flatId, billing_month: billingMonth })
    });
  }

  // IoT Infrastructure Sensors
  getIoTSensors(ventureId = null) {
    const q = ventureId ? `?venture_id=${ventureId}` : '';
    return this.request(`/iot/sensors${q}`);
  }

  simulateIoTSpike(sensorId) {
    return this.request('/iot/simulate-spike', {
      method: 'POST',
      body: JSON.stringify({ sensor_id: sensorId })
    });
  }

  resetIoTSensor(sensorId) {
    return this.request('/iot/reset-sensor', {
      method: 'POST',
      body: JSON.stringify({ sensor_id: sensorId })
    });
  }

  // Audit Logs
  getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit/logs${query ? '?' + query : ''}`);
  }

  // Analytics
  getAnalytics() {
    return this.request('/analytics/summary');
  }
}

export const api = new ApiService();

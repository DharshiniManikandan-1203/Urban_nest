import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderTicketsView(container) {
  const { activeVentureId, activeRole } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading tickets...</div>`;

  try {
    const res = await api.getTickets({ venture_id: activeVentureId });
    const tickets = res.data;

    const html = `
      <div class="tickets-view animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.3rem;">Helpdesk & Floor Issue Escalation</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Hierarchical issue dispatch: Resident ➔ Floor Manager ➔ Block Manager ➔ Venture Admin.
            </p>
          </div>
          <button class="btn btn-primary" id="btn-raise-ticket">
            <i class="fa-solid fa-plus"></i> Raise Maintenance Ticket
          </button>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Ticket Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Location / Flat</th>
                <th>Reported By</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map(t => `
                <tr>
                  <td>
                    <strong style="color: #f8fafc;">${t.title}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${t.description}
                    </div>
                  </td>
                  <td><span class="badge badge-purple">${t.category}</span></td>
                  <td>
                    <span class="badge ${t.priority === 'HIGH' || t.priority === 'EMERGENCY' ? 'badge-danger' : (t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-primary')}">
                      ${t.priority}
                    </span>
                  </td>
                  <td>
                    <strong style="color: #f8fafc;">Flat ${t.flat_number}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${t.block_name} (${t.floor_name})</div>
                  </td>
                  <td>
                    <div>${t.user_name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${t.user_email}</div>
                  </td>
                  <td>
                    <span style="font-size: 0.8rem; color: #818cf8; font-weight: 600;">
                      <i class="fa-solid fa-user-shield"></i> ${t.assigned_to_role || 'FLOOR_MANAGER'}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'badge-success' : (t.status === 'IN_PROGRESS' ? 'badge-cyan' : 'badge-warning')}">
                      ${t.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" data-resolve-tkt="${t.id}">
                      Manage
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

    // Attach manage ticket
    container.querySelectorAll('[data-resolve-tkt]').forEach(btn => {
      btn.onclick = () => {
        const tktId = btn.dataset.resolveTkt;
        const targetTicket = tickets.find(t => t.id === tktId);
        openResolveTicketModal(targetTicket);
      };
    });

    // Raise ticket
    document.getElementById('btn-raise-ticket').onclick = () => openRaiseTicketModal();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading tickets: ${err.message}</div>`;
  }
}

function openResolveTicketModal(ticket) {
  const bodyHtml = `
    <form id="resolve-tkt-form" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="background: rgba(0,0,0,0.25); padding: 14px; border-radius: var(--radius-sm);">
        <div style="font-weight: 700; font-size: 1.1rem; color: #f8fafc;">${ticket.title}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${ticket.description}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
          📍 Location: Flat ${ticket.flat_number}, ${ticket.block_name} (${ticket.floor_name})
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Update Status</label>
        <select class="form-select" id="tkt-status-select">
          <option value="OPEN" ${ticket.status === 'OPEN' ? 'selected' : ''}>OPEN (Pending Review)</option>
          <option value="IN_PROGRESS" ${ticket.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS (Technician Dispatched)</option>
          <option value="RESOLVED" ${ticket.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED (Work Completed)</option>
          <option value="CLOSED" ${ticket.status === 'CLOSED' ? 'selected' : ''}>CLOSED (Resident Confirmed)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Resolution Notes / Action Taken</label>
        <textarea class="form-textarea" id="tkt-notes" rows="3" placeholder="Describe the fix or technician findings...">${ticket.resolution_notes || ''}</textarea>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%;">
        <i class="fa-solid fa-floppy-disk"></i> Save & Notify Resident
      </button>
    </form>
  `;

  Modal.show({
    title: `Manage Ticket: ${ticket.title}`,
    bodyHtml,
    size: 'md'
  });

  document.getElementById('resolve-tkt-form').onsubmit = async (e) => {
    e.preventDefault();
    const newStatus = document.getElementById('tkt-status-select').value;
    const notes = document.getElementById('tkt-notes').value;

    try {
      await api.resolveTicket(ticket.id, newStatus, notes);
      Modal.hide();
      showToast(`Ticket status updated to ${newStatus}`, 'success');
      renderTicketsView(document.getElementById('view-container'));
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    }
  };
}

async function openRaiseTicketModal() {
  const activeVentureId = state.getState().activeVentureId;
  let flats = [];
  try {
    const res = await api.getFlats({ venture_id: activeVentureId });
    flats = res.data;
  } catch (e) {
    flats = [];
  }

  const bodyHtml = `
    <form id="create-tkt-form" style="display: flex; flex-direction: column; gap: 14px;">
      <div class="form-group">
        <label class="form-label">Select Unit / Flat</label>
        <select class="form-select" id="new-tkt-flat" required>
          ${flats.map(f => `
            <option value="${f.id}" data-floor-id="${f.floor_id}">
              Flat ${f.flat_number} (${f.block_name} - ${f.floor_name})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Issue Title</label>
        <input type="text" class="form-input" id="new-tkt-title" placeholder="e.g. Corridor Light Replacement" required />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="new-tkt-category">
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="ELEVATOR">Elevator / Lift</option>
            <option value="CLEANLINESS">Cleanliness & Hygiene</option>
            <option value="AMENITY">Amenity Equipment</option>
            <option value="SECURITY">Security / Access</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="new-tkt-priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM" selected>Medium</option>
            <option value="HIGH">High</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Detailed Description</label>
        <textarea class="form-textarea" id="new-tkt-desc" rows="3" placeholder="Provide details regarding the problem..." required></textarea>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%;">
        <i class="fa-solid fa-paper-plane"></i> Submit Ticket to Floor Manager
      </button>
    </form>
  `;

  Modal.show({
    title: 'Raise Maintenance / Facility Ticket',
    bodyHtml,
    size: 'md'
  });

  document.getElementById('create-tkt-form').onsubmit = async (e) => {
    e.preventDefault();
    const selectElem = document.getElementById('new-tkt-flat');
    const flatId = selectElem.value;
    const selectedOption = selectElem.options[selectElem.selectedIndex];
    const floorId = selectedOption.dataset.floorId;

    const title = document.getElementById('new-tkt-title').value;
    const category = document.getElementById('new-tkt-category').value;
    const priority = document.getElementById('new-tkt-priority').value;
    const desc = document.getElementById('new-tkt-desc').value;

    try {
      await api.createTicket({
        flat_id: flatId,
        floor_id: floorId,
        title,
        description: desc,
        category,
        priority
      });

      Modal.hide();
      showToast('Ticket logged successfully and assigned to Floor Manager!', 'success');
      renderTicketsView(document.getElementById('view-container'));
    } catch (err) {
      showToast(`Submission failed: ${err.message}`, 'error');
    }
  };
}

import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { openQrPassModal } from './amenitiesView.js';

export async function renderBookingsView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading bookings...</div>`;

  try {
    const res = await api.getBookings({ venture_id: activeVentureId });
    const bookings = res.data;

    const html = `
      <div class="bookings-view animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 1.3rem;">Amenity Reservations & Digital Passes</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Track resident slot bookings, capacity quotas, and gate verification passes.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" id="btn-verify-qr-code">
              <i class="fa-solid fa-qrcode"></i> Validate Gate QR Pass
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.app.navigateTo('amenities')">
              <i class="fa-solid fa-plus"></i> New Reservation
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Resident / Flat</th>
                <th>Date & Slot</th>
                <th>Attendees</th>
                <th>Pass Code</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${bookings.map(b => `
                <tr>
                  <td>
                    <strong style="color: #f8fafc;">${b.amenity_name || b.catalog_name}</strong>
                    <div style="font-size: 0.75rem; color: var(--accent-cyan);">${b.category}</div>
                  </td>
                  <td>
                    <div style="font-weight: 600;">${b.user_name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Flat ${b.flat_number} (${b.block_name})</div>
                  </td>
                  <td>
                    <div>📅 ${b.booking_date}</div>
                    <div style="font-size: 0.75rem; color: #818cf8;">⏰ ${b.start_time} - ${b.end_time}</div>
                  </td>
                  <td>${b.attendee_count} Person(s)</td>
                  <td><code>${b.qr_pass_code}</code></td>
                  <td>
                    <span style="color: ${b.amount_paid === 0 ? '#34d399' : '#fbbf24'}; font-weight: 700;">
                      ${b.amount_paid === 0 ? 'FREE' : `₹${b.amount_paid}`}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${b.status === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}">
                      ${b.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" data-show-pass="${b.id}">
                      <i class="fa-solid fa-qrcode"></i> View QR
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

    // View QR handler
    container.querySelectorAll('[data-show-pass]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.showPass;
        const b = bookings.find(item => item.id === id);
        if (b) {
          openQrPassModal({
            amenity: b.amenity_name || b.catalog_name,
            bookingDate: b.booking_date,
            timeSlot: `${b.start_time} - ${b.end_time}`,
            qrPassCode: b.qr_pass_code
          });
        }
      };
    });

    // Verify QR modal
    document.getElementById('btn-verify-qr-code').onclick = () => openVerifyQrModal();

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading bookings: ${err.message}</div>`;
  }
}

function openVerifyQrModal() {
  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="form-group">
        <label class="form-label">Scan / Enter QR Pass Code</label>
        <input type="text" class="form-input" id="verify-pass-input" placeholder="e.g. PASS-SWIM-001" style="font-family: 'JetBrains Mono', monospace;" />
      </div>

      <button class="btn btn-primary" id="btn-submit-verify">
        <i class="fa-solid fa-magnifying-glass"></i> Verify Digital Pass
      </button>

      <div id="verify-result-box" style="margin-top: 10px;"></div>
    </div>
  `;

  Modal.show({
    title: 'Security Gatekeeper QR Verification',
    bodyHtml,
    size: 'sm'
  });

  document.getElementById('btn-submit-verify').onclick = async () => {
    const code = document.getElementById('verify-pass-input').value.trim();
    const resultBox = document.getElementById('verify-result-box');
    if (!code) return;

    try {
      const res = await api.verifyQrPass(code);
      const data = res.data;

      resultBox.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; padding: 14px; border-radius: var(--radius-sm);">
          <div style="color: #34d399; font-weight: 700; font-size: 1.1rem;">
            <i class="fa-solid fa-circle-check"></i> PASS VALID - ADMIT RESIDENT
          </div>
          <div style="font-size: 0.85rem; margin-top: 8px;">
            <div><strong>Resident:</strong> ${data.resident_name} (${data.resident_phone})</div>
            <div><strong>Location:</strong> Flat ${data.flat_number}, ${data.block_name} (${data.venture_name})</div>
            <div><strong>Amenity:</strong> ${data.amenity_name}</div>
            <div><strong>Time:</strong> ⏰ ${data.start_time} - ${data.end_time}</div>
          </div>
        </div>
      `;
    } catch (e) {
      resultBox.innerHTML = `
        <div style="background: rgba(244, 63, 94, 0.15); border: 1px solid #f43f5e; padding: 14px; border-radius: var(--radius-sm); color: #fb7185;">
          <i class="fa-solid fa-circle-xmark"></i> <strong>INVALID PASS:</strong> ${e.message}
        </div>
      `;
    }
  };
}

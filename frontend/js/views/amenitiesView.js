import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderAmenitiesView(container) {
  const { activeVentureId, ventures, currentUser } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading amenities...</div>`;

  try {
    const amenitiesRes = await api.getVentureAmenities(activeVentureId);
    const amenities = amenitiesRes.data;
    const currentVenture = ventures.find(v => v.id === activeVentureId) || { name: 'Current Venture', code: 'DHAR' };

    const iconMap = {
      waves: 'fa-solid fa-person-swimming',
      dumbbell: 'fa-solid fa-dumbbell',
      activity: 'fa-solid fa-baseball-bat-ball',
      'glass-water': 'fa-solid fa-champagne-glasses',
      zap: 'fa-solid fa-charging-station',
      trophy: 'fa-solid fa-table-tennis-paddle-ball',
      sunset: 'fa-solid fa-martini-glass-citrus',
      flame: 'fa-solid fa-hot-tub-person'
    };

    const isDharshiniA = currentVenture.code === 'DHAR-A';
    const isDharshiniB = currentVenture.code === 'DHAR-B';

    const html = `
      <div class="amenities-view animate-fade">
        <!-- Amenities Banner with Venture Specific Info -->
        <div class="amenities-hero-banner">
          <div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <h2 style="font-size: 1.35rem; color: #ffffff;">${currentVenture.name} Facilities</h2>
              <span class="badge ${isDharshiniA ? 'badge-primary' : 'badge-cyan'}">
                ${amenities.length} Amenities Provisioned
              </span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
              ${isDharshiniA 
                ? '⭐ Premium Venture: Includes all 8 sports, wellness, social banquet, and utility amenities.' 
                : '🌿 Standard Venture: Optimized community with dedicated Swimming Pool amenity only.'}
            </p>
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" id="btn-toggle-venture-view">
              <i class="fa-solid fa-arrows-rotate"></i> Switch to ${isDharshiniA ? 'Dharshini B (Pool Only)' : 'Dharshini A (Full Suite)'}
            </button>
          </div>
        </div>

        <!-- Amenities Grid -->
        <div class="amenity-cards-grid">
          ${amenities.map(item => `
            <div class="amenity-card">
              <div>
                <div class="amenity-icon-circle">
                  <i class="${iconMap[item.icon_name] || 'fa-solid fa-spa'}"></i>
                </div>
                <div class="amenity-name">${item.custom_name || item.catalog_name}</div>
                <div class="amenity-desc">${item.catalog_description || 'Exclusive facility for registered residents.'}</div>
                
                <div class="amenity-specs-list">
                  <div class="amenity-spec-item">
                    <span><i class="fa-solid fa-clock"></i> Timings:</span>
                    <span>${item.opening_time} - ${item.closing_time}</span>
                  </div>
                  <div class="amenity-spec-item">
                    <span><i class="fa-solid fa-hourglass-half"></i> Slot Duration:</span>
                    <span>${item.slot_duration_minutes} Mins</span>
                  </div>
                  <div class="amenity-spec-item">
                    <span><i class="fa-solid fa-users"></i> Max Capacity:</span>
                    <span>${item.max_capacity_per_slot} People / Slot</span>
                  </div>
                  <div class="amenity-spec-item">
                    <span><i class="fa-solid fa-tag"></i> Resident Access:</span>
                    <span style="color: ${item.booking_fee === 0 ? '#34d399' : '#fbbf24'}; font-weight: 700;">
                      ${item.booking_fee === 0 ? 'FREE' : `₹${item.booking_fee}`}
                    </span>
                  </div>
                </div>
              </div>

              <button class="btn btn-primary btn-sm" data-book-amenity="${item.id}" style="width: 100%; margin-top: 12px;">
                <i class="fa-solid fa-calendar-check"></i> Book Time Slot
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Toggle button handler
    const toggleBtn = document.getElementById('btn-toggle-venture-view');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const nextId = isDharshiniA ? 'ven-dharshini-b' : 'ven-dharshini-a';
        state.setState({ activeVentureId: nextId });
        showToast(`Switched view to ${isDharshiniA ? 'Dharshini B' : 'Dharshini A'}`, 'info');
      };
    }

    // Attach booking handler to buttons
    container.querySelectorAll('[data-book-amenity]').forEach(btn => {
      btn.onclick = () => {
        const amenityId = btn.dataset.bookAmenity;
        const targetAmenity = amenities.find(a => a.id === amenityId);
        openBookingModal(targetAmenity);
      };
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading amenities: ${err.message}</div>`;
  }
}

async function openBookingModal(amenity) {
  const today = new Date().toISOString().split('T')[0];
  const activeVentureId = state.getState().activeVentureId;

  // Get flats for selection
  let flats = [];
  try {
    const flatsRes = await api.getFlats({ venture_id: activeVentureId });
    flats = flatsRes.data;
  } catch (e) {
    flats = [];
  }

  const bodyHtml = `
    <form id="booking-form" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); padding: 14px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 14px;">
        <div style="font-size: 1.8rem; color: var(--brand-primary-light);"><i class="fa-solid fa-calendar-check"></i></div>
        <div>
          <div style="font-weight: 700; font-size: 1.05rem;">${amenity.custom_name || amenity.catalog_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            Slot: ${amenity.slot_duration_minutes} Mins • Capacity: ${amenity.max_capacity_per_slot} Max • Fee: ${amenity.booking_fee === 0 ? 'FREE' : `₹${amenity.booking_fee}`}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Select Associated Flat / Unit</label>
        <select class="form-select" id="book-flat-id" required>
          ${flats.map(f => `
            <option value="${f.id}">Unit ${f.flat_number} (${f.block_name} - ${f.owner_name || 'Resident'})</option>
          `).join('')}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Booking Date</label>
          <input type="date" class="form-input" id="book-date" value="${today}" min="${today}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Select Start Time</label>
          <select class="form-select" id="book-time-slot" required>
            <option value="06:00">06:00 AM</option>
            <option value="07:00" selected>07:00 AM</option>
            <option value="08:00">08:00 AM</option>
            <option value="09:00">09:00 AM</option>
            <option value="17:00">05:00 PM</option>
            <option value="18:00">06:00 PM</option>
            <option value="19:00">07:00 PM</option>
            <option value="20:00">08:00 PM</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Number of Attendees</label>
        <input type="number" class="form-input" id="book-attendees" min="1" max="${amenity.max_capacity_per_slot}" value="1" required />
      </div>

      <div class="form-group">
        <label class="form-label">Special Notes / Equipment Request (Optional)</label>
        <textarea class="form-textarea" id="book-notes" rows="2" placeholder="e.g., Badminton rackets requested"></textarea>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
        <i class="fa-solid fa-qrcode"></i> Confirm & Generate Digital QR Pass
      </button>
    </form>
  `;

  Modal.show({
    title: 'Reserve Amenity Slot',
    bodyHtml,
    size: 'md'
  });

  const form = document.getElementById('booking-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const flatId = document.getElementById('book-flat-id').value;
    const bookingDate = document.getElementById('book-date').value;
    const startTime = document.getElementById('book-time-slot').value;
    
    // Calculate end time
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + amenity.slot_duration_minutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    const attendees = parseInt(document.getElementById('book-attendees').value, 10);
    const notes = document.getElementById('book-notes').value;

    try {
      const res = await api.createBooking({
        venture_amenity_id: amenity.id,
        flat_id: flatId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        attendee_count: attendees,
        notes: notes
      });

      Modal.hide();
      showToast('Amenity slot booked successfully!', 'success');

      // Show QR Pass Modal
      openQrPassModal(res.booking);

    } catch (err) {
      showToast(`Booking failed: ${err.message}`, 'error');
    }
  };
}

export function openQrPassModal(booking) {
  const bodyHtml = `
    <div class="qr-pass-card">
      <div style="font-size: 0.78rem; text-transform: uppercase; color: var(--accent-cyan); font-weight: 700; letter-spacing: 0.08em;">
        DIGITAL AMENITY ENTRY PASS
      </div>
      <h3 style="font-size: 1.3rem; margin: 6px 0;">${booking.amenity}</h3>
      <div style="font-size: 0.88rem; color: var(--text-secondary);">
        📅 ${booking.bookingDate} • ⏰ ${booking.timeSlot}
      </div>

      <div class="qr-code-box">
        <!-- Generates dynamic SVG QR style or mock QR -->
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <rect width="100" height="100" fill="#ffffff"/>
          <!-- Corner squares -->
          <rect x="10" y="10" width="24" height="24" fill="#0f172a"/>
          <rect x="14" y="14" width="16" height="16" fill="#ffffff"/>
          <rect x="18" y="18" width="8" height="8" fill="#0f172a"/>

          <rect x="66" y="10" width="24" height="24" fill="#0f172a"/>
          <rect x="70" y="14" width="16" height="16" fill="#ffffff"/>
          <rect x="74" y="18" width="8" height="8" fill="#0f172a"/>

          <rect x="10" y="66" width="24" height="24" fill="#0f172a"/>
          <rect x="14" y="70" width="16" height="16" fill="#ffffff"/>
          <rect x="18" y="74" width="8" height="8" fill="#0f172a"/>

          <!-- Data dots pattern -->
          <rect x="42" y="12" width="6" height="6" fill="#0f172a"/>
          <rect x="52" y="16" width="6" height="6" fill="#0f172a"/>
          <rect x="44" y="26" width="6" height="6" fill="#0f172a"/>
          <rect x="12" y="42" width="6" height="6" fill="#0f172a"/>
          <rect x="24" y="46" width="6" height="6" fill="#0f172a"/>
          <rect x="38" y="40" width="10" height="10" fill="#0f172a"/>
          <rect x="52" y="44" width="8" height="8" fill="#0f172a"/>
          <rect x="66" y="42" width="6" height="6" fill="#0f172a"/>
          <rect x="80" y="48" width="6" height="6" fill="#0f172a"/>
          <rect x="42" y="66" width="6" height="6" fill="#0f172a"/>
          <rect x="54" y="72" width="8" height="8" fill="#0f172a"/>
          <rect x="68" y="68" width="6" height="6" fill="#0f172a"/>
          <rect x="78" y="78" width="8" height="8" fill="#0f172a"/>
        </svg>
      </div>

      <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 700; color: #818cf8; margin-bottom: 8px;">
        ${booking.qrPassCode}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">
        Show this QR code at the facility checkpoint or security desk for admission.
      </div>
    </div>
  `;

  Modal.show({
    title: 'Access Pass Generated',
    bodyHtml,
    size: 'sm'
  });
}

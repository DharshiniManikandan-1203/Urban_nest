import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderMaintenanceView(container) {
  const { activeVentureId, ventures } = state.getState();
  const currentVenture = ventures.find(v => v.id === activeVentureId) || { name: 'Venture', maintenance_rate: 3.5 };

  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading billing ledger...</div>`;

  try {
    const res = await api.getInvoices({ venture_id: activeVentureId });
    const invoices = res.data;

    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;

    invoices.forEach(inv => {
      totalBilled += inv.total_amount;
      if (inv.status === 'PAID') totalCollected += inv.total_amount;
      else totalPending += inv.total_amount;
    });

    const html = `
      <div class="maintenance-view animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.3rem;">Maintenance Billing Ledger</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Automated per-sq.ft rate billing (Current Rate: <strong>₹${currentVenture.maintenance_rate}/sq.ft</strong>)
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btn-generate-invoices">
              <i class="fa-solid fa-calculator"></i> Run Monthly Billing Cycle
            </button>
          </div>
        </div>

        <!-- Financial Summary Banner -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 24px;">
          <div class="glass-panel" style="padding: 20px; border-left: 4px solid var(--brand-primary);">
            <div style="font-size: 0.8rem; color: var(--text-muted);">TOTAL INVOICED</div>
            <div style="font-size: 1.6rem; font-weight: 700; color: #f8fafc; margin-top: 4px;">
              ₹${totalBilled.toLocaleString()}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${invoices.length} Invoices Generated</div>
          </div>

          <div class="glass-panel" style="padding: 20px; border-left: 4px solid var(--accent-emerald);">
            <div style="font-size: 0.8rem; color: var(--text-muted);">COLLECTED REVENUE</div>
            <div style="font-size: 1.6rem; font-weight: 700; color: #34d399; margin-top: 4px;">
              ₹${totalCollected.toLocaleString()}
            </div>
            <div style="font-size: 0.75rem; color: #34d399;">Settled Invoices</div>
          </div>

          <div class="glass-panel" style="padding: 20px; border-left: 4px solid var(--accent-amber);">
            <div style="font-size: 0.8rem; color: var(--text-muted);">PENDING RECEIVABLES</div>
            <div style="font-size: 1.6rem; font-weight: 700; color: #fbbf24; margin-top: 4px;">
              ₹${totalPending.toLocaleString()}
            </div>
            <div style="font-size: 0.75rem; color: #fbbf24;">Awaiting Resident Payment</div>
          </div>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Flat & Block</th>
                <th>Owner / Resident</th>
                <th>Billing Period</th>
                <th>Area (sq.ft)</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(inv => `
                <tr>
                  <td>
                    <code style="color: #818cf8; font-weight: 600;">${inv.invoice_number}</code>
                  </td>
                  <td>
                    <strong style="color: #f8fafc;">Flat ${inv.flat_number}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${inv.block_name} (${inv.floor_name})</div>
                  </td>
                  <td>
                    <div style="font-weight: 600;">${inv.owner_name || 'Resident'}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${inv.owner_phone || ''}</div>
                  </td>
                  <td>${inv.billing_month}</td>
                  <td>${inv.built_up_area_sqft} sq.ft</td>
                  <td>
                    <strong style="font-size: 1rem; color: #f8fafc;">₹${inv.total_amount.toLocaleString()}</strong>
                  </td>
                  <td>
                    <span class="badge ${inv.status === 'PAID' ? 'badge-success' : 'badge-warning'}">
                      ${inv.status}
                    </span>
                  </td>
                  <td>
                    ${inv.status === 'PENDING' ? `
                      <button class="btn btn-success btn-sm" data-pay-invoice="${inv.id}" data-amount="${inv.total_amount}">
                        <i class="fa-solid fa-credit-card"></i> Pay Now
                      </button>
                    ` : `
                      <span style="font-size: 0.78rem; color: #34d399;">
                        <i class="fa-solid fa-check-double"></i> Paid (${inv.payment_method || 'UPI'})
                      </span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach payment simulation handlers
    container.querySelectorAll('[data-pay-invoice]').forEach(btn => {
      btn.onclick = () => {
        const invId = btn.dataset.payInvoice;
        const amount = btn.dataset.amount;
        openPaymentModal(invId, amount);
      };
    });

    // Generate invoices modal
    document.getElementById('btn-generate-invoices').onclick = () => openGenerateInvoicesModal(activeVentureId);

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading maintenance: ${err.message}</div>`;
  }
}

function openPaymentModal(invoiceId, amount) {
  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 16px; border-radius: var(--radius-sm); text-align: center;">
        <div style="font-size: 0.8rem; color: var(--text-secondary);">INVOICE AMOUNT DUE</div>
        <div style="font-size: 2rem; font-weight: 700; color: #34d399; font-family: 'Outfit';">₹${amount}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Select Payment Gateway / Method</label>
        <select class="form-select" id="pay-method-select">
          <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
          <option value="NETBANKING">Internet Banking (HDFC / ICICI / SBI)</option>
          <option value="CREDIT_CARD">Credit / Debit Card</option>
        </select>
      </div>

      <button class="btn btn-success" id="btn-confirm-pay" style="width: 100%;">
        <i class="fa-solid fa-lock"></i> Authorize & Settle Invoice
      </button>
    </div>
  `;

  Modal.show({
    title: 'Simulate Maintenance Fee Payment',
    bodyHtml,
    size: 'sm'
  });

  document.getElementById('btn-confirm-pay').onclick = async () => {
    const method = document.getElementById('pay-method-select').value;
    try {
      await api.payInvoice(invoiceId, method);
      Modal.hide();
      showToast('Payment successful! Receipt generated and ledger updated.', 'success');
      renderMaintenanceView(document.getElementById('view-container'));
    } catch (err) {
      showToast(`Payment failed: ${err.message}`, 'error');
    }
  };
}

function openGenerateInvoicesModal(ventureId) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const bodyHtml = `
    <form id="gen-inv-form" style="display: flex; flex-direction: column; gap: 14px;">
      <p style="font-size: 0.85rem; color: var(--text-secondary);">
        This tool executes billing for all units in the venture, calculating dues as <code>Built-Up Area (sq.ft) × Maintenance Rate</code>.
      </p>

      <div class="form-group">
        <label class="form-label">Billing Cycle Month (YYYY-MM)</label>
        <input type="month" class="form-input" id="gen-month" value="${currentMonth}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Payment Due Date</label>
        <input type="date" class="form-input" id="gen-due-date" required />
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
        <i class="fa-solid fa-file-invoice-dollar"></i> Generate Monthly Invoices
      </button>
    </form>
  `;

  Modal.show({
    title: 'Run Automated Maintenance Invoicing',
    bodyHtml,
    size: 'md'
  });

  // Set default due date to 25th of month
  const dueDateInput = document.getElementById('gen-due-date');
  if (dueDateInput) {
    const d = new Date();
    d.setDate(25);
    dueDateInput.value = d.toISOString().split('T')[0];
  }

  document.getElementById('gen-inv-form').onsubmit = async (e) => {
    e.preventDefault();
    const month = document.getElementById('gen-month').value;
    const dueDate = document.getElementById('gen-due-date').value;

    try {
      const res = await api.generateInvoices(ventureId, month, dueDate);
      Modal.hide();
      showToast(res.message, 'success');
      renderMaintenanceView(document.getElementById('view-container'));
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, 'error');
    }
  };
}

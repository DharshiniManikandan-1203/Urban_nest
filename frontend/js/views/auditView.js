import { api } from '../api.js';
import { state } from '../state.js';
import { Modal } from '../components/modal.js';
import { realtime } from '../realtime.js';

export async function renderAuditView(container) {
  const { activeVentureId } = state.getState();
  container.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i> Loading Security & Operations Audit Trail...</div>`;

  try {
    const res = await api.getAuditLogs({ venture_id: activeVentureId, limit: 100 });
    let logs = res.data;

    function renderTable(logsToDisplay) {
      const html = `
        <div class="audit-view animate-fade">
          <!-- Header Banner -->
          <div class="glass-panel" style="padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.3rem;">
                <i class="fa-solid fa-file-shield"></i>
              </div>
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 700;">Immutable Security & Operational Audit Trail</h2>
                <p style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 2px;">
                  Tamper-evident chronological record of all administrative, financial, gatekeeper, and IoT events
                </p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge badge-primary"><i class="fa-solid fa-fingerprint"></i> SHA-256 Ledger Verified</span>
            </div>
          </div>

          <!-- Filters Row -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-sm btn-primary btn-audit-filter" data-action="">All Events (${logs.length})</button>
              <button class="btn btn-sm btn-secondary btn-audit-filter" data-action="GATE_CHECK_IN">Gate Events</button>
              <button class="btn btn-sm btn-secondary btn-audit-filter" data-action="TICKET_AUTO_ESCALATED">SLA Escalations</button>
              <button class="btn btn-sm btn-secondary btn-audit-filter" data-action="INTEGRATED_INVOICE_GENERATED">Billing & Dues</button>
              <button class="btn btn-sm btn-secondary btn-audit-filter" data-action="IOT_ANOMALY_TRIGGERED">IoT Alarms</button>
            </div>

            <div style="width: 260px;">
              <input type="text" id="audit-search-input" class="form-control" placeholder="Search actor, action, ID..." style="font-size: 0.85rem;" />
            </div>
          </div>

          <!-- Audit Table -->
          <div class="glass-panel" style="padding: 24px;">
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action Event</th>
                    <th>Actor Identity</th>
                    <th>Role</th>
                    <th>Resource Target</th>
                    <th>Details & Description</th>
                    <th>Inspect</th>
                  </tr>
                </thead>
                <tbody id="audit-table-body">
                  ${logsToDisplay.map(log => renderAuditRow(log)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Filter buttons
      container.querySelectorAll('.btn-audit-filter').forEach(btn => {
        btn.onclick = () => {
          container.querySelectorAll('.btn-audit-filter').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          });
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');

          const act = btn.dataset.action;
          const filtered = act ? logs.filter(l => l.action.includes(act)) : logs;
          renderTable(filtered);
        };
      });

      // Search input
      const searchInput = container.querySelector('#audit-search-input');
      if (searchInput) {
        searchInput.oninput = (e) => {
          const q = e.target.value.toLowerCase();
          const filtered = logs.filter(l => 
            l.action.toLowerCase().includes(q) ||
            (l.user_name && l.user_name.toLowerCase().includes(q)) ||
            (l.details && l.details.toLowerCase().includes(q))
          );
          const tbody = container.querySelector('#audit-table-body');
          if (tbody) {
            tbody.innerHTML = filtered.map(log => renderAuditRow(log)).join('');
            attachInspectListeners();
          }
        };
      }

      attachInspectListeners();
    }

    function attachInspectListeners() {
      container.querySelectorAll('.btn-inspect-audit').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const log = logs.find(l => l.id === id);
          if (log) openAuditInspector(log);
        };
      });
    }

    renderTable(logs);

    // Subscribe to live audit events
    realtime.on('AUDIT_LOG_ENTRY', (newLog) => {
      logs.unshift(newLog);
      const tbody = container.querySelector('#audit-table-body');
      if (tbody) {
        const tr = document.createElement('tr');
        tr.className = 'animate-fade';
        tr.innerHTML = renderAuditRow(newLog);
        tbody.prepend(tr);
        attachInspectListeners();
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Error loading Audit Trail: ${err.message}</div>`;
  }
}

function renderAuditRow(log) {
  const isSecurity = log.action.includes('GATE') || log.action.includes('SECURITY') || log.action.includes('ESCALATED') || log.action.includes('ANOMALY');
  const actionBadge = isSecurity ? 'badge-danger' : (log.action.includes('INVOICE') ? 'badge-warning' : 'badge-primary');

  const timeStr = log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now';
  const dateStr = log.created_at ? new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

  return `
    <tr id="audit-row-${log.id}">
      <td>
        <span style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${dateStr} ${timeStr}</span>
      </td>
      <td>
        <span class="badge ${actionBadge}">${log.action}</span>
      </td>
      <td>
        <strong>${log.user_name || 'System Bot'}</strong>
      </td>
      <td>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${log.user_role || 'SYSTEM'}</span>
      </td>
      <td>
        <span style="font-family: monospace; font-size: 0.8rem; color: #818cf8;">${log.resource_type || 'CORE'}</span>
      </td>
      <td>
        <div style="font-size: 0.82rem; color: var(--text-secondary); max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${log.details || ''}">
          ${log.details || 'No additional parameters logged'}
        </div>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm btn-inspect-audit" data-id="${log.id}" style="padding: 3px 8px;">
          <i class="fa-solid fa-code"></i> JSON
        </button>
      </td>
    </tr>
  `;
}

function openAuditInspector(log) {
  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm);">
        <div>
          <div style="font-weight: 700; font-family: monospace; color: #818cf8;">Audit Record: ${log.id}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">${log.created_at}</div>
        </div>
        <span class="badge badge-primary">${log.action}</span>
      </div>

      <pre style="background: #020617; border: 1px solid var(--border-subtle); padding: 16px; border-radius: var(--radius-sm); font-size: 0.82rem; color: #34d399; font-family: monospace; overflow-x: auto; max-height: 350px;">
${JSON.stringify(log, null, 2)}
      </pre>
    </div>
  `;

  Modal.show({
    title: '🔍 Immutable Audit Payload Inspection',
    bodyHtml,
    size: 'lg'
  });
}
